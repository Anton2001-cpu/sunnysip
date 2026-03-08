import SunCalc from 'suncalc'

export function getSunPosition(lat, lng, date = new Date()) {
  const pos = SunCalc.getPosition(date, lat, lng)
  return {
    altitude: pos.altitude,        // hoogte boven horizon (radialen)
    azimuth: pos.azimuth,          // richting (radialen, N=0)
    altitudeDeg: pos.altitude * (180 / Math.PI),
    azimuthDeg: (pos.azimuth * (180 / Math.PI) + 180) % 360,
    isAboveHorizon: pos.altitude > 0,
  }
}

export function getSunTimes(lat, lng, date = new Date()) {
  return SunCalc.getTimes(date, lat, lng)
}
