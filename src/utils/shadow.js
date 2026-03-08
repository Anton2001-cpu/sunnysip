import * as turf from '@turf/turf'

/**
 * Berekent of een punt in de schaduw staat van omliggende gebouwen.
 *
 * @param {[number, number]} terraceLngLat  - [lng, lat] van het terras
 * @param {Array} buildings                 - lijst van gebouwen { polygon, height }
 * @param {{ altitudeDeg, azimuthDeg }} sun - zonpositie
 * @returns {{ inSun: boolean, blockedBy: string|null }}
 */
export function isTerraceInSun(terraceLngLat, buildings, sun) {
  if (!sun.isAboveHorizon) {
    return { inSun: false, blockedBy: 'nacht' }
  }

  const terracePoint = turf.point(terraceLngLat)

  for (const building of buildings) {
    const blocked = isShadowCastOnPoint(terraceLngLat, building, sun)
    if (blocked) {
      return { inSun: false, blockedBy: building.name || 'gebouw' }
    }
  }

  return { inSun: true, blockedBy: null }
}

/**
 * Controleert of een gebouw schaduw werpt op een punt.
 * Methode: bereken de schaduwpolygoon van het gebouw en kijk of het punt erin valt.
 */
function isShadowCastOnPoint(terraceLngLat, building, sun) {
  try {
    const shadowPoly = buildingShadowPolygon(building, sun)
    if (!shadowPoly) return false
    const point = turf.point(terraceLngLat)
    return turf.booleanPointInPolygon(point, shadowPoly)
  } catch {
    return false
  }
}

/**
 * Berekent de schaduwpolygoon van een gebouw.
 * De schaduw is de projectie van het gebouw in de tegenovergestelde richting van de zon.
 */
function buildingShadowPolygon(building, sun) {
  const { altitudeDeg, azimuthDeg } = sun
  if (altitudeDeg <= 0) return null

  // Schaduwlengte = hoogte / tan(zonhoogte)
  // We werken in graden en converteren naar ~meters op 51° breedte
  const shadowLength = building.height / Math.tan(altitudeDeg * Math.PI / 180)

  // Richting van schaduw = tegenovergesteld aan zon
  const shadowDir = (azimuthDeg + 180) % 360

  // Verschuif elke hoek van het gebouw in schaduwrichting
  const coords = building.polygon.geometry.coordinates[0]
  const shifted = coords.map(coord => {
    const pt = turf.point(coord)
    const moved = turf.destination(pt, shadowLength / 1000, shadowDir, { units: 'kilometers' })
    return moved.geometry.coordinates
  })

  // Maak een polygoon die origineel + verschoven omhulsel bevat
  const combined = [...coords, ...shifted.reverse(), coords[0]]
  return turf.polygon([combined])
}
