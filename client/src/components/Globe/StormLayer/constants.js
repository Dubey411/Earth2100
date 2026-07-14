/**
 * StormLayer/constants.js
 *
 * Real-world tropical cyclone / hurricane basin locations.
 * These are the world's most active storm generation zones.
 * Each entry drives a full animated vortex on the globe.
 */

export const STORM_BASINS = [
  // ── Western Pacific (most active basin on Earth) ─────────────
  { id: 'wPac1',  lat: 15.2,  lng: 135.8, name: 'Super Typhoon Corridor',   cat: 5, radius: 8.5, intensity: 1.00 },
  { id: 'wPac2',  lat: 20.1,  lng: 128.4, name: 'Philippine Sea',           cat: 4, radius: 7.0, intensity: 0.88 },
  { id: 'wPac3',  lat: 10.6,  lng: 142.3, name: 'Mariana Typhoon Zone',     cat: 4, radius: 6.5, intensity: 0.82 },

  // ── Eastern Pacific ──────────────────────────────────────────
  { id: 'ePac1',  lat: 14.5,  lng: -108.2, name: 'Eastern Pacific Hurricane',cat: 3, radius: 6.0, intensity: 0.75 },
  { id: 'ePac2',  lat: 11.8,  lng: -95.6,  name: 'Tehuantepec Gulf',        cat: 2, radius: 5.0, intensity: 0.60 },

  // ── Atlantic Basin ───────────────────────────────────────────
  { id: 'atl1',   lat: 26.4,  lng: -70.8, name: 'Caribbean Hurricane',      cat: 4, radius: 7.2, intensity: 0.85 },
  { id: 'atl2',   lat: 18.2,  lng: -57.5, name: 'Lesser Antilles Cyclone',  cat: 3, radius: 5.8, intensity: 0.70 },
  { id: 'atl3',   lat: 32.5,  lng: -62.0, name: 'Bermuda High Vortex',      cat: 1, radius: 4.2, intensity: 0.45 },

  // ── Indian Ocean / Arabian Sea ───────────────────────────────
  { id: 'aro1',   lat: 16.5,  lng: 64.2,  name: 'Arabian Sea Cyclone',      cat: 3, radius: 6.0, intensity: 0.72 },
  { id: 'bay1',   lat: 13.8,  lng: 88.4,  name: 'Bay of Bengal Cyclone',    cat: 4, radius: 7.0, intensity: 0.80 },

  // ── South Indian Ocean ───────────────────────────────────────
  { id: 'sio1',   lat: -16.2, lng: 62.8,  name: 'Mascarene Cyclone',        cat: 3, radius: 5.5, intensity: 0.65 },
  { id: 'sio2',   lat: -21.4, lng: 80.3,  name: 'South Indian Typhoon',     cat: 2, radius: 4.8, intensity: 0.55 },

  // ── Australian Region ────────────────────────────────────────
  { id: 'aus1',   lat: -18.6, lng: 121.4, name: 'NW Australia Cyclone',     cat: 4, radius: 6.8, intensity: 0.78 },
]

/**
 * Map category (1–5) to color
 */
export function catToColor(cat) {
  const map = {
    1: '#a8dadc',
    2: '#48cae4',
    3: '#00b4d8',
    4: '#f77f00',
    5: '#e63946',
  }
  return map[cat] ?? '#ffffff'
}

/**
 * Map category to Saffir-Simpson label
 */
export function catToLabel(cat) {
  const map = {
    1: 'CAT 1 · 74–95 mph',
    2: 'CAT 2 · 96–110 mph',
    3: 'CAT 3 · 111–129 mph (Major)',
    4: 'CAT 4 · 130–156 mph (Extreme)',
    5: 'CAT 5 · 157+ mph (Catastrophic)',
  }
  return map[cat] ?? 'Tropical Storm'
}

/**
 * 🌀 Live Feed: Fetches active tropical cyclones from GDACS live API feed.
 * Returns custom storm objects for the storm layer.
 */
export async function fetchLiveStorms() {
  try {
    const res = await fetch('https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const features = json.features ?? []

    const cyclones = features
      .filter(f => f.properties?.eventtype === 'TC')
      .map((f) => {
        const props  = f.properties ?? {}
        const coords = f.geometry?.coordinates ?? [0, 0]
        const desc   = props.htmldescription ?? props.description ?? ''

        // Parse category from description
        let cat = 1
        if (desc.includes('Category 5') || desc.includes('Cat 5') || desc.toLowerCase().includes('super')) cat = 5
        else if (desc.includes('Category 4') || desc.includes('Cat 4')) cat = 4
        else if (desc.includes('Category 3') || desc.includes('Cat 3')) cat = 3
        else if (desc.includes('Category 2') || desc.includes('Cat 2')) cat = 2
        else if (desc.includes('Category 1') || desc.includes('Cat 1')) cat = 1
        else {
          const sev = props.severitydata?.severity ?? 0
          if (sev >= 252) cat = 5
          else if (sev >= 209) cat = 4
          else if (sev >= 178) cat = 3
          else if (sev >= 154) cat = 2
          else cat = 1
        }

        return {
          id: `gdacs-tc-${props.eventid}`,
          lat: coords[1],
          lng: coords[0],
          name: props.eventname || props.name || 'Active Cyclone',
          cat,
          radius: 5.5 + cat * 0.8,
          intensity: 0.6 + cat * 0.08,
          isLive: true,
          desc: props.htmldescription ?? props.description ?? 'Active tropical cyclone tracked by GDACS.'
        }
      })

    if (cyclones.length > 0) {
      console.info(`[StormLayer/GDACS] Successfully loaded ${cyclones.length} active tropical cyclones!`)
      return cyclones
    }
  } catch (err) {
    console.warn('[StormLayer/GDACS] Live active storms feed unavailable, falling back:', err.message)
  }
  return null
}
