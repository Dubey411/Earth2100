// Climate signal definitions — drives the sidebar button labels, icons, colors, and descriptions.
// Visual hotspot positions are now managed in EarthGlobe.jsx → SIGNAL_HOTSPOT_DATA.

export const SIGNALS = [
  {
    id: 'heat',
    label: 'Heat Stress',
    icon: '🌡',
    color: '#ff8c00',
    description: 'Extreme heat anomaly — WBGT index above 32°C in major population zones.',
  },
  {
    id: 'flood',
    label: 'Flood Risk',
    icon: '🌊',
    color: '#3399ff',
    description: 'Flood-vulnerable river delta and low-lying coastal zones.',
  },
  {
    id: 'wildfire',
    label: 'Wildfire Risk',
    icon: '🔥',
    color: '#ff4500',
    description: 'High fire-weather index regions with active wildfire perimeters.',
  },
  {
    id: 'drought',
    label: 'Drought Index',
    icon: '🏜',
    color: '#b5651d',
    description: 'PDSI drought index showing severe to exceptional multi-year drought.',
  },
  {
    id: 'cryo',
    label: 'Cryosphere Loss',
    icon: '🧊',
    color: '#00ffff',
    description: 'Glacier retreat, sea-ice loss, and ice sheet mass balance anomalies.',
  },
  {
    id: 'air',
    label: 'Air Pollution',
    icon: '🌫',
    color: '#9370db',
    description: 'PM2.5 and AQI hotspots from industry, agriculture, and transport.',
  },
  {
    id: 'forest',
    label: 'Forest Loss',
    icon: '🌲',
    color: '#ff0000',
    description: 'Primary forest canopy loss from fires, logging, and clearance.',
  },
  {
    id: 'sealevel',
    label: 'Sea Level Rise',
    icon: '🌊',
    color: '#00bfff',
    description: 'Projected coastal inundation zones from accelerating sea-level rise.',
  },
  {
    id: 'enso',
    label: 'ENSO',
    icon: '⚡',
    color: '#ffb347',
    description: 'El Niño / La Niña Pacific Ocean warming and cooling current patterns.',
  },
  {
    id: 'storm',
    label: 'Storm Activity',
    icon: '🌀',
    color: '#cc66ff',
    description: 'Tropical cyclone tracks, typhoons, and hurricane formation zones.',
  },
]
