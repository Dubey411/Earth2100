/**
 * AirPollutionLayer/constants.js
 *
 * Defines major global air pollution hotspots, their coordinates,
 * and handles real-time air quality API fetching.
 *
 * Data Sources (priority order):
 *   🌍 All cities (primary):    WAQI — World Air Quality Index (aqicn.org)
 *   🇮🇳 India (secondary):      data.gov.in CPCB real-time AQI API
 *   🌐 Final fallback:           Open-Meteo Air Quality API
 */

// ─── WAQI API (World Air Quality Index) ─────────────────────────────────────
const WAQI_TOKEN  = '2cd04ea0ee7f9221176d984cca162cf2cd3eb030'
const WAQI_BASE   = 'https://api.waqi.info/feed'

// ─── CPCB API (data.gov.in) – India-specific ────────────────────────────────
const CPCB_API_KEY      = '579b464db66ec23bdd0000019e4ce98d731744127a60a571c3942d6d'
const CPCB_RESOURCE_ID  = '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'
const CPCB_BASE_URL     = `https://api.data.gov.in/resource/${CPCB_RESOURCE_ID}`

export const POLLUTION_HOTSPOTS = [
  { id: 'ap-delhi',   lat: 28.6139,  lng: 77.2090,   name: 'Delhi NCR',          country: 'India',     baseAqi: 320, cpcbCity: 'Delhi'   },
  { id: 'ap-lahore',  lat: 31.5204,  lng: 74.3587,   name: 'Lahore District',     country: 'Pakistan',  baseAqi: 290, cpcbCity: null       },
  { id: 'ap-beijing', lat: 39.9042,  lng: 116.4074,  name: 'Beijing Central',     country: 'China',     baseAqi: 180, cpcbCity: null       },
  { id: 'ap-jakarta', lat: -6.2088,  lng: 106.8456,  name: 'Jakarta Metro',       country: 'Indonesia', baseAqi: 165, cpcbCity: null       },
  { id: 'ap-mexico',  lat: 19.4326,  lng: -99.1332,  name: 'Mexico City Valley',  country: 'Mexico',    baseAqi: 155, cpcbCity: null       },
]

/**
 * Converts India CPCB PM2.5 (µg/m³) to US EPA AQI using official breakpoints.
 * ref: https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf
 */
export function pm25ToUsAqi(pm25) {
  const v = parseFloat(pm25)
  if (isNaN(v) || v < 0) return 0
  const breakpoints = [
    [0,     12.0,   0,   50],
    [12.1,  35.4,  51,  100],
    [35.5,  55.4, 101,  150],
    [55.5, 150.4, 151,  200],
    [150.5,250.4, 201,  300],
    [250.5,500.4, 301,  500],
  ]
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (v >= cLow && v <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (v - cLow) + iLow)
    }
  }
  return 500
}

/**
 * 🌍 PRIMARY: Fetches real-time AQI from WAQI by geo-coordinate.
 * Returns full pollutant breakdown: PM2.5, PM10, O3, NO2, SO2, CO.
 * Endpoint: GET /feed/geo:{lat};{lng}/?token={token}
 */
export async function fetchWaqiAqi(lat, lng, cityName = '') {
  const url = `${WAQI_BASE}/geo:${lat};${lng}/?token=${WAQI_TOKEN}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`WAQI HTTP ${res.status}`)
    const json = await res.json()

    if (json.status !== 'ok' || !json.data) throw new Error('WAQI bad status')

    const d         = json.data
    const aqi       = typeof d.aqi === 'number' ? d.aqi : parseInt(d.aqi, 10)
    const iaqi      = d.iaqi ?? {}
    const stationCity = d.city?.name ?? cityName

    // Extract individual pollutant values (µg/m³ or ppb as returned by WAQI)
    const pm25 = iaqi.pm25?.v ?? null
    const pm10 = iaqi.pm10?.v ?? null
    const o3   = iaqi.o3?.v   ?? null
    const no2  = iaqi.no2?.v  ?? null
    const so2  = iaqi.so2?.v  ?? null
    const co   = iaqi.co?.v   ?? null

    // Dominant pollutant label
    const dominant = d.dominentpol ?? (pm25 != null ? 'pm25' : 'aqi')

    console.info(
      `[Pollution/WAQI] ${stationCity}: AQI=${aqi} | PM2.5=${pm25} | PM10=${pm10} | O3=${o3} | NO2=${no2}`
    )

    return {
      aqi,
      pm25,
      pm10,
      o3,
      no2,
      so2,
      co,
      dominant,
      source:      'WAQI',
      stationName: stationCity,
      lastUpdate:  d.time?.s ?? null,
    }
  } catch (err) {
    console.warn(`[Pollution/WAQI] Failed for ${cityName || `${lat},${lng}`}:`, err.message)
    return null
  }
}

/**
 * 🇮🇳 SECONDARY (India-only): Fetches real-time PM2.5 from India CPCB API.
 * Averages all PM2.5 station readings → converts to US AQI.
 */
export async function fetchCpcbAqi(cityName) {
  const url = `${CPCB_BASE_URL}?api-key=${CPCB_API_KEY}&format=json&limit=50&filters[city]=${encodeURIComponent(cityName)}&filters[pollutant_id]=PM2.5`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`CPCB API error ${res.status}`)
    const data = await res.json()
    const records = data?.records ?? []
    const valid = records
      .map(r => parseFloat(r.avg_value))
      .filter(v => !isNaN(v) && v > 0)
    if (valid.length === 0) return null

    const avgPm25    = valid.reduce((a, b) => a + b, 0) / valid.length
    const aqi        = pm25ToUsAqi(avgPm25)
    const lastUpdate = records[0]?.last_update ?? null

    console.info(`[Pollution/CPCB] ${cityName}: PM2.5 avg=${avgPm25.toFixed(1)} µg/m³ from ${valid.length} stations → US AQI=${aqi} (updated: ${lastUpdate})`)
    return { pm25: avgPm25, aqi, source: 'CPCB', lastUpdate, stationCount: valid.length }
  } catch (err) {
    console.warn(`[Pollution/CPCB] Failed for city "${cityName}":`, err)
    return null
  }
}

/**
 * 🌐 FALLBACK: Open-Meteo Air Quality API.
 * Used only when both WAQI and CPCB fail.
 */
export async function fetchOpenMeteoAqi(lat, lng) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,us_aqi`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Open-Meteo API error')
    const data = await res.json()
    const pm25 = data?.current?.pm2_5 ?? 35.0
    const aqi  = data?.current?.us_aqi ?? 95
    return { pm25, aqi, source: 'Open-Meteo' }
  } catch (err) {
    console.warn(`[Pollution/Open-Meteo] Failed for ${lat},${lng}:`, err)
    return null
  }
}

/**
 * Smart fetch — priority chain:
 *   1. WAQI (global, real-time, full pollutant breakdown)
 *   2. CPCB (India-only, station-level granularity)
 *   3. Open-Meteo (final fallback)
 */
export async function fetchLiveAqi(hotspot) {
  // 1️⃣ Try WAQI first — works for every city worldwide
  const waqiData = await fetchWaqiAqi(hotspot.lat, hotspot.lng, hotspot.name)
  if (waqiData) return waqiData

  // 2️⃣ For Indian cities, try CPCB as backup
  if (hotspot.cpcbCity) {
    const cpcbData = await fetchCpcbAqi(hotspot.cpcbCity)
    if (cpcbData) return cpcbData
  }

  // 3️⃣ Final fallback
  return fetchOpenMeteoAqi(hotspot.lat, hotspot.lng)
}

/**
 * Maps US AQI to category color and health advisory label
 */
export function getAqiCategory(aqi) {
  if (aqi <= 50)  return { label: 'Good',                          color: '#22c55e', desc: 'Air quality is satisfactory, and air pollution poses little or no risk.' }
  if (aqi <= 100) return { label: 'Moderate',                      color: '#eab308', desc: 'Air quality is acceptable. However, risk may exist for unusually sensitive groups.' }
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#f97316', desc: 'Members of sensitive groups may experience health effects.' }
  if (aqi <= 200) return { label: 'Unhealthy',                     color: '#ef4444', desc: 'Everyone may begin to experience health effects; sensitive groups may feel more serious effects.' }
  if (aqi <= 300) return { label: 'Very Unhealthy',                color: '#a855f7', desc: 'Health alert: everyone may experience more serious health effects.' }
  return            { label: 'Hazardous',                          color: '#7f1d1d', desc: 'Health warning of emergency conditions: everyone is more likely to be affected.' }
}
