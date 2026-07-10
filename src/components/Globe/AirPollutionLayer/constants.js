/**
 * AirPollutionLayer/constants.js
 *
 * Defines major global air pollution hotspots, their coordinates,
 * and handles real-time Open-Meteo Air Quality API fetching.
 */

export const POLLUTION_HOTSPOTS = [
  { id: 'ap-delhi',   lat: 28.6139, lng: 77.2090, name: 'Delhi NCR',        country: 'India',        baseAqi: 320 },
  { id: 'ap-lahore',  lat: 31.5204, lng: 74.3587, name: 'Lahore District',  country: 'Pakistan',     baseAqi: 290 },
  { id: 'ap-beijing', lat: 39.9042, lng: 116.4074, name: 'Beijing Central',  country: 'China',        baseAqi: 180 },
  { id: 'ap-jakarta', lat: -6.2088, lng: 106.8456, name: 'Jakarta Metro',    country: 'Indonesia',    baseAqi: 165 },
  { id: 'ap-mexico',  lat: 19.4326, lng: -99.1332, name: 'Mexico City Valley', country: 'Mexico',     baseAqi: 155 },
]

/**
 * Fetches current PM2.5 & AQI indices from Open-Meteo Air Quality API
 */
export async function fetchLiveAqi(lat, lng) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,us_aqi`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('API response error')
    const data = await res.json()
    const pm25 = data?.current?.pm2_5 ?? 35.0
    const aqi  = data?.current?.us_aqi ?? 95
    return { pm25, aqi }
  } catch (err) {
    console.warn(`[Pollution] Failed to fetch air quality for ${lat},${lng}. Using default.`, err)
    return null
  }
}

/**
 * Maps US AQI to category color and health advisory label
 */
export function getAqiCategory(aqi) {
  if (aqi <= 50) {
    return { label: 'Good', color: '#22c55e', desc: 'Air quality is satisfactory, and air pollution poses little or no risk.' }
  }
  if (aqi <= 100) {
    return { label: 'Moderate', color: '#eab308', desc: 'Air quality is acceptable. However, risk may exist for unusually sensitive groups.' }
  }
  if (aqi <= 150) {
    return { label: 'Unhealthy for Sensitive Groups', color: '#f97316', desc: 'Members of sensitive groups may experience health effects.' }
  }
  if (aqi <= 200) {
    return { label: 'Unhealthy', color: '#ef4444', desc: 'Everyone may begin to experience health effects; sensitive groups may feel more serious effects.' }
  }
  if (aqi <= 300) {
    return { label: 'Very Unhealthy', color: '#a855f7', desc: 'Health alert: everyone may experience more serious health effects.' }
  }
  return { label: 'Hazardous', color: '#7f1d1d', desc: 'Health warning of emergency conditions: everyone is more likely to be affected.' }
}
