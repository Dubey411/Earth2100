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
    id: 'air',
    label: 'Air Pollution',
    icon: '🌫',
    color: '#9370db',
    description: 'PM2.5 and AQI hotspots from industry, agriculture, and transport.',
  },
  {
    id: 'storm',
    label: 'Storm Activity',
    icon: '🌀',
    color: '#cc66ff',
    description: 'Tropical cyclone tracks, typhoons, and hurricane formation zones.',
  },
  {
    id: 'enso',
    label: 'ENSO',
    icon: '⚡',
    color: '#ffb347',
    description: 'El Niño / La Niña Pacific Ocean warming and cooling current patterns.',
  },
  {
    id: 'solar',
    label: 'Solar Storm',
    icon: '☀️',
    color: '#ffaa00',
    description: 'Coronal mass ejection (CME) impact — solar wind colliding with Earth\'s magnetosphere, creating intense auroras.',
  },
]
