import { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getSunPosition, getSunTimes } from './utils/sun'
import { isTerraceInSun } from './utils/shadow'
import { fetchTerraces, fetchBuildings } from './utils/overpass'
import './App.css'

// Beveiligt tegen XSS: zet gevaarlijke HTML-tekens om naar veilige tekst
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const ANTWERP_CENTER = [4.4025, 51.2194]

export default function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef(new Map())
  const [terraces, setTerraces] = useState([])
  const [buildings, setBuildings] = useState([])
  const [sun, setSun] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })

  const selectedDate = selectedTime.slice(0, 10)
  const selectedHour = selectedTime.slice(11, 16)
  const [stats, setStats] = useState({ inSun: 0, inShade: 0 })
  const [terraceResults, setTerraceResults] = useState([])
  const [sunTimes, setSunTimes] = useState(null)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const debounceRef = useRef(null)
  const cacheRef = useRef(new Map())

  const loadData = useCallback(async (lat, lng) => {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
    if (cacheRef.current.has(key)) {
      const cached = cacheRef.current.get(key)
      setTerraces(cached.terraces)
      setBuildings(cached.buildings)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const [newTerraces, newBuildings] = await Promise.all([
        fetchTerraces(lat, lng, 400),
        fetchBuildings(lat, lng, 400),
      ])
      const seen = new Set()
      const unique = newTerraces.filter(t => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
      cacheRef.current.set(key, { terraces: unique, buildings: newBuildings })
      setTerraces(unique)
      setBuildings(newBuildings)
    } catch (e) {
      console.error('Data laden mislukt:', e)
      setError(true)
    }
    setLoading(false)
  }, [])

  // Init kaart
  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: ANTWERP_CENTER,
      zoom: 15,
      pitch: 45,
    })

    map.current.on('load', () => {
      // Taak 16: voeg gebouwen in vóór de eerste symbol-laag zodat straatnames zichtbaar blijven
      const firstSymbolLayer = map.current.getStyle().layers.find(l => l.type === 'symbol')
      try {
        map.current.addLayer({
          id: '3d-buildings',
          source: 'carto',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': '#e0d6c8',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.6,
          },
        }, firstSymbolLayer?.id)
      } catch (e) {
        // 3D gebouwen niet beschikbaar in deze stijl
      }

      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
      map.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right')

      loadData(ANTWERP_CENTER[1], ANTWERP_CENTER[0])
    })

    // Debounce: wacht 800ms nadat de kaart stilstaat voor een API-call
    map.current.on('moveend', () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const center = map.current.getCenter()
        loadData(center.lat, center.lng)
      }, 800)
    })
  }, [loadData])

  // Herbereken markers als tijd of data verandert
  useEffect(() => {
    if (!map.current || terraces.length === 0) return

    const date = new Date(selectedTime)
    const center = map.current.getCenter()
    const sunPos = getSunPosition(center.lat, center.lng, date)
    setSun(sunPos)
    setSunTimes(getSunTimes(center.lat, center.lng, date))

    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

    let inSunCount = 0
    let inShadeCount = 0
    const results = []

    terraces.forEach(terrace => {
      const { inSun } = isTerraceInSun(terrace.lngLat, buildings, sunPos)
      if (inSun) inSunCount++
      else inShadeCount++

      results.push({ terrace, inSun })

      const el = document.createElement('div')
      el.className = `terrace-marker ${inSun ? 'in-sun' : 'in-shade'}`
      el.innerHTML = `
        <div class="pin-head">${inSun ? '☀️' : '🌑'}</div>
        <div class="pin-point"></div>
      `
      el.title = `${escapeHtml(terrace.name)} — ${inSun ? 'In de zon' : 'In de schaduw'}`

      const popup = new mapboxgl.Popup({ offset: 40, closeButton: false, maxWidth: '220px' }).setHTML(`
        <div class="popup">
          <div class="popup-name">${escapeHtml(terrace.name)}</div>
          <div class="popup-row">
            <span class="popup-badge ${inSun ? 'sun' : 'shade'}">${inSun ? '☀️ In de zon' : '🌑 In de schaduw'}</span>
          </div>
          <div class="popup-type">${escapeHtml(terrace.type)}${terrace.hasOutdoorSeating ? ' · 🪑 Buiten zitten' : ''}</div>
          <div class="popup-action">Bekijk op kaart →</div>
        </div>
      `)

      const marker = new mapboxgl.Marker(el, { anchor: 'bottom', offset: [0, -4] })
        .setLngLat(terrace.lngLat)
        .setPopup(popup)
        .addTo(map.current)

      markersRef.current.set(terrace.id, marker)
    })

    results.sort((a, b) => b.inSun - a.inSun)
    setTerraceResults(results)
    setStats({ inSun: inSunCount, inShade: inShadeCount })
  }, [terraces, buildings, selectedTime])

  function goToMyLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
      const { longitude, latitude } = pos.coords
      map.current?.flyTo({ center: [longitude, latitude], zoom: 15 })
    })
  }

  const sunTerraces = terraceResults.filter(r => r.inSun)
  const shadeTerraces = terraceResults.filter(r => !r.inSun)

  return (
    <div className="app">
      <div ref={mapContainer} className="map" />

      <div className="sidebar">
        <div className="panel-header">
          <div className="logo-area">
            <div className="logo-icon">🌞</div>
            <div className="logo-text">
              <h1>SunnySip</h1>
              <p>Welk terrasje zit in de zon?</p>
            </div>
          </div>
          <div className="time-row">
            <div className="time-input-wrapper">
              <span className="time-icon">📅</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedTime(e.target.value + 'T' + selectedHour)}
              />
            </div>
            <div className="time-input-wrapper">
              <span className="time-icon">🕐</span>
              <input
                type="time"
                value={selectedHour}
                onChange={e => setSelectedTime(selectedDate + 'T' + e.target.value)}
              />
            </div>
            <button
              className="now-btn"
              onClick={() => {
                const now = new Date()
                const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                setSelectedTime(local)
              }}
            >Nu</button>
          </div>
        </div>

        {sun && (
          <div className={`sun-bar ${sun.isAboveHorizon ? '' : 'night'}`}>
            <span className="sun-bar-icon">{sun.isAboveHorizon ? '☀️' : '🌙'}</span>
            <div className="sun-bar-stats">
              <div className="sun-bar-stat"><span>Hoogte</span><strong>{sun.altitudeDeg.toFixed(1)}°</strong></div>
              <div className="sun-bar-stat"><span>Richting</span><strong>{sun.azimuthDeg.toFixed(0)}°</strong></div>
              {sunTimes && <div className="sun-bar-stat"><span>Op</span><strong>{sunTimes.sunrise.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</strong></div>}
              {sunTimes && <div className="sun-bar-stat"><span>Onder</span><strong>{sunTimes.sunset.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</strong></div>}
            </div>
          </div>
        )}

        <div className="count-chips">
          <div className="chip sun">☀️ {stats.inSun} in de zon</div>
          <div className="chip shade">🌑 {stats.inShade} in schaduw</div>
        </div>

        {loading && <div className="loading-bar" />}

        <div className="terrace-list">
          {error && (
            <div className="empty-state">
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
              <div>Kon geen data laden</div>
              <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Controleer je internetverbinding</div>
              <button className="retry-btn" onClick={() => { const c = map.current?.getCenter(); if (c) loadData(c.lat, c.lng) }}>
                Probeer opnieuw
              </button>
            </div>
          )}
          {!error && terraceResults.length === 0 && !loading && (
            <div className="empty-state">
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🍺</div>
              <div>Geen terrassen gevonden</div>
              <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Beweeg de kaart om meer te laden</div>
            </div>
          )}

          {sunTerraces.length > 0 && <div className="list-section-label">☀️ In de zon ({sunTerraces.length})</div>}
          {sunTerraces.map(({ terrace: t }) => (
            <div key={t.id} className={`terrace-item${selectedId === t.id ? ' selected' : ''}`} onClick={() => {
                setSelectedId(t.id)
                map.current?.flyTo({ center: t.lngLat, zoom: 18 })
                setTimeout(() => {
                  const marker = markersRef.current.get(t.id)
                  if (marker && !marker.getPopup().isOpen()) marker.togglePopup()
                }, 800)
              }}>
              <div className="terrace-dot sun">☀️</div>
              <div className="terrace-info">
                <div className="terrace-name">{t.name}</div>
                <div className="terrace-meta">
                  <span className="terrace-type">{t.type}</span>
                  {t.hasOutdoorSeating && <span className="outdoor-badge">🪑</span>}
                </div>
              </div>
              <div className="terrace-badge sun">Zon</div>
            </div>
          ))}

          {shadeTerraces.length > 0 && <div className="list-section-label">🌑 In de schaduw ({shadeTerraces.length})</div>}
          {shadeTerraces.map(({ terrace: t }) => (
            <div key={t.id} className={`terrace-item${selectedId === t.id ? ' selected' : ''}`} onClick={() => {
                setSelectedId(t.id)
                map.current?.flyTo({ center: t.lngLat, zoom: 18 })
                setTimeout(() => {
                  const marker = markersRef.current.get(t.id)
                  if (marker && !marker.getPopup().isOpen()) marker.togglePopup()
                }, 800)
              }}>
              <div className="terrace-dot shade">🌑</div>
              <div className="terrace-info">
                <div className="terrace-name">{t.name}</div>
                <div className="terrace-meta">
                  <span className="terrace-type">{t.type}</span>
                  {t.hasOutdoorSeating && <span className="outdoor-badge">🪑</span>}
                </div>
              </div>
              <div className="terrace-badge shade">Schaduw</div>
            </div>
          ))}
        </div>
      </div>

      <button className="locate-btn" onClick={goToMyLocation} title="Mijn locatie">
        📍
      </button>
    </div>
  )
}
