export const SIGNAL_HOTSPOT_DATA = {
  flood: [
    { id: 'fl-bang', lat: 23.7, lng: 90.4, label: 'Bangladesh', radius: 44, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
    { id: 'fl-pak', lat: 30, lng: 70, label: 'Pakistan', radius: 40, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
    { id: 'fl-india', lat: 20, lng: 85, label: 'Eastern India', radius: 42, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
    { id: 'fl-neth', lat: 52.3, lng: 5.3, label: 'Netherlands', radius: 32, c1: '#3399ff', c2: '#4da6ff', c3: '#80c0ff' },
    { id: 'fl-miss', lat: 36, lng: -90, label: 'Mississippi', radius: 38, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
  ],
  wildfire: [
    { id: 'wf-ca', lat: 38.5, lng: -121, label: 'California', radius: 40, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
    { id: 'wf-can', lat: 54, lng: -115, label: 'Canada', radius: 46, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
    { id: 'wf-aus', lat: -32, lng: 148, label: 'Australia', radius: 48, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
    { id: 'wf-med', lat: 39, lng: 22, label: 'Mediterranean', radius: 38, c1: '#ff4500', c2: '#ff6b35', c3: '#ffa07a' },
    { id: 'wf-sib', lat: 62, lng: 105, label: 'Siberia', radius: 44, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
  ],
  drought: [
    { id: 'dr-hoa', lat: 10, lng: 42, label: 'Horn of Africa', radius: 54, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
    { id: 'dr-amz', lat: -6, lng: -63, label: 'Amazon', radius: 48, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
    { id: 'dr-raj', lat: 27, lng: 72, label: 'Rajasthan', radius: 40, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
    { id: 'dr-chile', lat: -28, lng: -70, label: 'Chile', radius: 36, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
  ],
  cryo: [
    { id: 'cr-arctic', lat: 82, lng: 0, label: 'Arctic', radius: 68, c1: '#00ffff', c2: '#66ffff', c3: '#aaffff' },
    { id: 'cr-green', lat: 72, lng: -40, label: 'Greenland', radius: 56, c1: '#00ffff', c2: '#66ffff', c3: '#aaffff' },
    { id: 'cr-ant', lat: -80, lng: 0, label: 'Antarctica', radius: 72, c1: '#00ffff', c2: '#66ffff', c3: '#aaffff' },
  ],
  air: [
    { id: 'ai-delhi', lat: 28.7, lng: 77.1, label: 'Delhi', radius: 38, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-beijing', lat: 39.9, lng: 116.4, label: 'Beijing', radius: 36, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-lahore', lat: 31.5, lng: 74.3, label: 'Lahore', radius: 34, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-mexico', lat: 19.4, lng: -99, label: 'Mexico City', radius: 36, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-jakarta', lat: -6, lng: 107, label: 'Jakarta', radius: 34, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
  ],
  forest: [
    { id: 'fo-amz', lat: -5, lng: -60, label: 'Amazon', radius: 60, c1: '#cc0000', c2: '#ff0000', c3: '#ff4444' },
    { id: 'fo-ind', lat: 0, lng: 115, label: 'Indonesia', radius: 48, c1: '#cc0000', c2: '#ff0000', c3: '#ff4444' },
    { id: 'fo-congo', lat: 0, lng: 24, label: 'Congo', radius: 50, c1: '#cc0000', c2: '#ff0000', c3: '#ff4444' },
  ],
  sealevel: [
    { id: 'sl-mum', lat: 18.9, lng: 72.8, label: 'Mumbai', radius: 30, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-jak', lat: -6.2, lng: 106.8, label: 'Jakarta', radius: 30, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-mia', lat: 25.8, lng: -80.2, label: 'Miami', radius: 28, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-ven', lat: 45.4, lng: 12.3, label: 'Venice', radius: 26, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-bang', lat: 22.3, lng: 91.8, label: 'Bangladesh Coast', radius: 28, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-male', lat: 4.2, lng: 73.5, label: 'Maldives', radius: 22, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
  ],
  enso: [
    { id: 'en-c', lat: 0, lng: -150, label: 'Central Pacific', radius: 70, c1: '#ff8c00', c2: '#ffb347', c3: '#ffd700' },
    { id: 'en-e', lat: 0, lng: -110, label: 'East Pacific', radius: 60, c1: '#ff6600', c2: '#ff8c00', c3: '#ffb347' },
    { id: 'en-w', lat: 5, lng: -175, label: 'West Pacific', radius: 56, c1: '#ff8c00', c2: '#ffb347', c3: '#ffd700' },
    { id: 'en-ni', lat: -5, lng: -160, label: 'Nino 3.4', radius: 64, c1: '#ff5c00', c2: '#ff8c00', c3: '#ffb347' },
  ],
  storm: [
    { id: 'st-phil', lat: 18, lng: 125, label: 'Philippines', radius: 36, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
    { id: 'st-gulf', lat: 24, lng: -88, label: 'Gulf of Mexico', radius: 34, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
    { id: 'st-ind', lat: -15, lng: 88, label: 'Indian Ocean', radius: 32, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
    { id: 'st-ecs', lat: 28, lng: 130, label: 'East China Sea', radius: 32, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
  ],
}

export const ENSO_ARCS = [
  { startLat: 0, startLng: 160, endLat: 2, endLng: -90, color: ['rgba(255,140,0,0.8)', 'rgba(255,165,0,0.4)'] },
  { startLat: 4, startLng: 155, endLat: 6, endLng: -80, color: ['rgba(255,120,0,0.7)', 'rgba(255,140,0,0.3)'] },
  { startLat: -4, startLng: 165, endLat: -4, endLng: -95, color: ['rgba(255,100,0,0.7)', 'rgba(255,120,0,0.3)'] },
  { startLat: 8, startLng: 150, endLat: 8, endLng: -75, color: ['rgba(255,160,0,0.6)', 'rgba(255,190,0,0.2)'] },
]

export const FLOOD_RINGS = [
  { lat: 23.7, lng: 90.4 },
  { lat: 30, lng: 70 },
  { lat: 20, lng: 85 },
  { lat: 52.3, lng: 5.3 },
  { lat: 36, lng: -90 },
]

export const SEALEVEL_RINGS = [
  { lat: 18.9, lng: 72.8 },
  { lat: -6.2, lng: 106.8 },
  { lat: 25.8, lng: -80.2 },
  { lat: 45.4, lng: 12.3 },
  { lat: 22.3, lng: 91.8 },
  { lat: 4.2, lng: 73.5 },
]
