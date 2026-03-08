/**
 * Haalt terrassen + gebouwen op rond een locatie via OpenStreetMap.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function fetchTerraces(lat, lng, radiusMeters = 500) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"cafe|bar|restaurant"]["outdoor_seating"="yes"](around:${radiusMeters},${lat},${lng});
      node["amenity"~"cafe|bar|restaurant"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
  })
  const data = await res.json()

  return data.elements.map(el => ({
    id: el.id,
    name: el.tags?.name || 'Onbekend terras',
    type: el.tags?.amenity,
    lngLat: [el.lon, el.lat],
    hasOutdoorSeating: el.tags?.outdoor_seating === 'yes',
  }))
}

export async function fetchBuildings(lat, lng, radiusMeters = 300) {
  const query = `
    [out:json][timeout:25];
    (
      way["building"](around:${radiusMeters},${lat},${lng});
    );
    out body geom;
  `
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
  })
  const data = await res.json()

  return data.elements
    .filter(el => el.geometry && el.geometry.length > 2)
    .map(el => {
      const coords = el.geometry.map(p => [p.lon, p.lat])
      // Sluit de polygoon
      if (coords[0][0] !== coords[coords.length - 1][0]) {
        coords.push(coords[0])
      }
      // Gebouwhoogte: gebruik tag of schat op basis van verdiepingen
      const levels = parseInt(el.tags?.['building:levels'] || 3)
      const height = parseFloat(el.tags?.height) || levels * 3

      return {
        id: el.id,
        name: el.tags?.name,
        height,
        polygon: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [coords] },
        },
      }
    })
}
