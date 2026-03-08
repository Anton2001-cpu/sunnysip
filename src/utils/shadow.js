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
 * Gebruikt convex hull over originele + verschoven hoeken voor correcte resultaten
 * bij onregelmatige (niet-convexe) gebouwen.
 */
function buildingShadowPolygon(building, sun) {
  const { altitudeDeg, azimuthDeg } = sun
  if (altitudeDeg <= 1) return null  // negeer zeer lage zon (lange foute schaduwen)

  // Schaduwlengte = hoogte / tan(zonhoogte), in km
  const altRad = altitudeDeg * Math.PI / 180
  const shadowLength = building.height / Math.tan(altRad) / 1000

  // Richting van schaduw = tegenovergesteld aan zon (azimuth is al compass N=0)
  const shadowDir = (azimuthDeg + 180) % 360

  const coords = building.polygon.geometry.coordinates[0]

  // Projecteer elke hoek in schaduwrichting
  const shifted = coords.map(coord => {
    const moved = turf.destination(turf.point(coord), shadowLength, shadowDir, { units: 'kilometers' })
    return moved.geometry.coordinates
  })

  // Convex hull van originele + verschoven hoeken → correcte schaduwvorm
  const allPoints = turf.featureCollection([...coords, ...shifted].map(c => turf.point(c)))
  const hull = turf.convex(allPoints)
  return hull || null
}
