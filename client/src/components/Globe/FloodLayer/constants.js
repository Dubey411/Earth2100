/**
 * constants.js — Shared data and utilities for the modular FloodLayer
 */

// ── Flood hotspot locations (lat, lng) ──────────────────────────────────────
export const FLOOD_HOTSPOTS = [
  [23.7,  90.4],   // Bangladesh
  [30.0,  70.0],   // Pakistan
  [20.0,  85.0],   // Eastern India
  [52.3,   5.3],   // Netherlands
  [36.0, -90.0],   // Mississippi
]

// ── Hotspot details for labeling ───────────────────────────────────────────
export const HOTSPOT_INFO = [
  { label: 'Bangladesh River Basin', lat: 23.7, lng: 90.4 },
  { label: 'Indus River Basin (Pakistan)', lat: 30.0, lng: 70.0 },
  { label: 'Eastern India Coast', lat: 20.0, lng: 85.0 },
  { label: 'Netherlands Delta', lat: 52.3, lng: 5.3 },
  { label: 'Mississippi Valley (USA)', lat: 36.0, lng: -90.0 },
]

// ── Water accumulation regions (lat, lng) ───────────────────────────────────
export const FLOOD_REGIONS = [
  [23.7,  90.4],   // Bangladesh
  [30.0,  70.0],   // Pakistan
  [22.0,  82.0],   // North India
  [30.0, 115.0],   // China river basins
  [-2.0, 115.0],   // Indonesia
  [12.0, 122.0],   // Philippines
  [-5.0, -60.0],   // Amazon Basin
  [36.0, -90.0],   // Mississippi Basin
]

/**
 * Convert geographic (lat, lng) to a unit 3D direction vector in the LOCAL
 * coordinate space of a Three.js Mesh that has `mesh.rotation.y = -Math.PI / 2`.
 */
export function latLngToLocalDir(lat, lng) {
  const phi  = (lng + 180) / 180 * Math.PI
  const v    = (90 - lat) / 180
  const sinV = Math.sin(v * Math.PI)
  const cosV = Math.cos(v * Math.PI)
  return {
    x: -Math.cos(phi) * sinV,
    y:  cosV,
    z:  Math.sin(phi) * sinV,
  }
}

/** Convert a local-space direction to world-space (accounting for Y rotation). */
export function localToWorld(localDir, r = 1) {
  return {
    x: -localDir.z * r,
    y:  localDir.y * r,
    z:  localDir.x * r,
  }
}

/**
 * Returns WMS URL for NASA GPM IMERG Real-time Precipitation Rate.
 * Uses a safe date 2 days ago to guarantee complete global coverage.
 */
export function getDynamicPrecipitationMapUrl() {
  const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const dateStr = date.toISOString().split('T')[0]
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=GPM_IMERG_Precipitation_Rate&TIME=${dateStr}&CRS=EPSG:4326&WIDTH=1024&HEIGHT=512&BBOX=-90,-180,90,180`
}

/**
 * 🌊 Live Feed: Fetches active flood events from GDACS live API feed.
 * Returns custom flood hotspot objects.
 */
export async function fetchLiveFloods() {
  try {
    const res = await fetch('https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const features = json.features ?? []

    const floods = features
      .filter(f => f.properties?.eventtype === 'FL')
      .map((f) => {
        const props  = f.properties ?? {}
        const coords = f.geometry?.coordinates ?? [0, 0]
        return {
          id: `gdacs-fl-${props.eventid}`,
          lat: coords[1],
          lng: coords[0],
          label: props.eventname || props.name || 'Active Flood Basin',
          desc: props.htmldescription ?? props.description ?? 'Extreme precipitation and flooding event tracked by GDACS.'
        }
      })

    if (floods.length > 0) {
      console.info(`[FloodLayer/GDACS] Successfully loaded ${floods.length} active flood events!`)
      return floods
    }
  } catch (err) {
    console.warn('[FloodLayer/GDACS] Live active floods feed unavailable, falling back:', err.message)
  }
  return null
}