/**
 * fetchENSOPhase.js — Fetches the real-time ENSO phase from NOAA.
 *
 * Data source: NOAA Climate Prediction Center
 * URL: https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
 *
 * The ONI (Oceanic Niño Index) is the 3-month running mean of SST anomaly
 * in the Niño3.4 region (5°N–5°S, 120°–170°W).
 *
 * Thresholds:
 *   ONI ≥ +0.5°C for 5 consecutive months = El Niño
 *   ONI ≤ −0.5°C for 5 consecutive months = La Niña
 *   Otherwise = Neutral
 *
 * Returns:
 *   { phase, oni, season, year, source, baseEnsoTime, label, color }
 */

const NOAA_ONI_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt'
// Public CORS proxy – used as fallback if direct fetch is blocked
const CORS_PROXY   = 'https://corsproxy.io/?url='

/**
 * Map ONI value to a position in our 0–24s simulation loop.
 *
 * Timeline reference:
 *   0–4s   Normal / La Niña amplified
 *   4–10s  El Niño developing
 *   10–18s El Niño peak
 *   18–24s Recovery to Normal
 *
 * We pick a baseEnsoTime that best represents the current condition,
 * then add a ±1.5s breathing oscillation in the animation loop.
 */
function oniToBaseTime(oni) {
  if (oni <= -0.5) {
    // La Niña — anchor in "Normal amplified" zone near t=1.5
    // More negative = more stable at t=1
    const strength = Math.min(Math.abs(oni + 0.5) / 2.0, 1.0)
    return 1.0 + strength * 1.0 // 1.0 → 2.0
  }
  if (oni < 0.5) {
    // Neutral — anchor at t=2 (calm Normal phase)
    const norm = (oni + 0.5) / 1.0  // 0 → 1
    return 2.0 + norm * 2.0         // 2 → 4
  }
  // El Niño — scale from t=5 (developing) to t=14 (strong peak)
  const strength = Math.min((oni - 0.5) / 2.0, 1.0)  // 0 → 1 for ONI 0.5 → 2.5
  return 5.0 + strength * 9.0  // 5 → 14
}

function parseONIText(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[A-Z]{3}\s+\d{4}/.test(l))  // lines starting with season code

  if (!lines.length) return null

  // Find most recent non-empty line
  for (let i = lines.length - 1; i >= 0; i--) {
    const parts = lines[i].split(/\s+/)
    if (parts.length >= 4) {
      const season = parts[0]
      const year   = parseInt(parts[1])
      const anom   = parseFloat(parts[3])
      if (!isNaN(anom)) {
        return { season, year, oni: anom }
      }
    }
  }
  return null
}

export async function fetchENSOPhase() {
  let text = null

  // 1. Try direct fetch (works if NOAA sends CORS headers)
  try {
    const res = await fetch(NOAA_ONI_URL, {
      cache: 'no-cache',
      headers: { Accept: 'text/plain' },
    })
    if (res.ok) {
      text = await res.text()
    }
  } catch (_) {
    // expected if CORS blocked
  }

  // 2. Fallback: CORS proxy
  if (!text) {
    try {
      const res = await fetch(CORS_PROXY + encodeURIComponent(NOAA_ONI_URL))
      if (res.ok) {
        text = await res.text()
      }
    } catch (_) {
      // proxy also failed
    }
  }

  // 3. No data available — return neutral fallback
  if (!text) {
    console.warn('[ENSO] Could not fetch NOAA ONI data. Using neutral fallback.')
    return {
      phase: 'neutral',
      oni: 0.0,
      season: '???',
      year: new Date().getFullYear(),
      source: 'fallback',
      baseEnsoTime: 2.0,
      label: 'Neutral (Estimated)',
      color: '#64748b',
    }
  }

  const parsed = parseONIText(text)
  if (!parsed) {
    return {
      phase: 'neutral',
      oni: 0.0,
      season: '???',
      year: new Date().getFullYear(),
      source: 'parse-error',
      baseEnsoTime: 2.0,
      label: 'Neutral (Parse Error)',
      color: '#64748b',
    }
  }

  const { oni, season, year } = parsed
  const baseEnsoTime = oniToBaseTime(oni)

  let phase, label, color
  if (oni >= 0.5) {
    if (oni >= 1.5)      { phase = 'strong-el-nino';    label = `Strong El Niño`;    color = '#ef4444' }
    else if (oni >= 1.0) { phase = 'moderate-el-nino';  label = `Moderate El Niño`;  color = '#f97316' }
    else                 { phase = 'weak-el-nino';       label = `Weak El Niño`;      color = '#fb923c' }
  } else if (oni <= -0.5) {
    if (oni <= -1.5)      { phase = 'strong-la-nina';   label = `Strong La Niña`;    color = '#3b82f6' }
    else if (oni <= -1.0) { phase = 'moderate-la-nina'; label = `Moderate La Niña`;  color = '#60a5fa' }
    else                  { phase = 'weak-la-nina';      label = `Weak La Niña`;      color = '#93c5fd' }
  } else {
    phase = 'neutral'
    label = 'Neutral Conditions'
    color = '#22c55e'
  }

  return { phase, oni, season, year, source: 'noaa-oni', baseEnsoTime, label, color }
}
