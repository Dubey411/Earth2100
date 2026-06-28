# 🌍 Earth 2100 — Climate Lens

> **An interactive 3-D Earth intelligence platform that visualises real-world climate signals, regional hotspots, and planetary futures — rendered in the browser with WebGL shaders and live GeoJSON overlays.**

---

## ✨ Overview

**Earth 2100** is a data-driven climate visualisation built on a photorealistic WebGL globe. It lets you explore nine live climate signals, drill into affected regions, and scrub through three long-term scenarios from *Stabilized Earth* to *Cascading Crisis* — all inside a dark, cinematic UI designed to communicate urgency without sacrificing clarity.

---

## 🎯 Features

### 🌐 Interactive 3-D Globe
- Photorealistic Blue Marble day texture with bump-mapped topology
- Additive night-lights layer and animated cloud shell
- Smooth fly-to navigation with damped orbital controls
- Auto-rotate with drag-to-pause and 3-second resume

### 🔴 Climate Signals (9 layers)
Toggle any signal to overlay it on the globe in real time:

| Signal | Visualisation |
|---|---|
| **Heat Stress** | GLSL shader — full latitude-based temperature gradient (arctic-blue → cyan → yellow → orange → crimson), land-masked with all 240+ countries, animated fbm turbulence |
| **Flood Risk** | Pulsing ripple hotspots + propagating ring overlays |
| **Wildfire Risk** | Flickering ember glows over fire-prone regions |
| **Drought Index** | Slow-diffuse radial hazes over arid zones |
| **Cryosphere Loss** | Breathing cyan pulses on Arctic, Greenland, Antarctica |
| **Air Pollution** | Purple haze clusters on megacity pollution corridors |
| **Forest Loss** | Blinking red overlays on Amazon, Congo, Indonesia |
| **Sea Level Rise** | Coastal ring propagations on threatened cities |
| **ENSO / El Niño** | Animated arc streams across the Pacific |

Each signal supports an **intensity slider** (0 → 100 %) that live-updates the shader uniforms and hotspot opacity.

### 📍 Regional Hotspot Inspector
- 20+ pre-mapped climate hotspots across every continent
- Click any pin to fly the camera to that region and open the **Climate Inspector** sidebar
- Per-region data: temperature anomaly, rainfall deviation, population at risk, disaster count, severity score
- Sparkline chart of historical temperature trend (1980 – 2024)
- Contextual issue cards (wildfire risk, wind patterns, reservoir levels, etc.)

### 🔭 Planetary Futures Drawer
Scrub a **2025 – 2100** year slider across three IPCC-aligned scenarios:

- 🟢 **Stabilized Earth** — Paris targets achieved, +1.5 °C
- 🟠 **Adaptation Gap** — Partial mitigation, +2.4 °C
- 🔴 **Cascading Crisis** — Current trajectory, +4.3 °C

Each scenario shows milestone events per decade and a compound-risk table of the world's most threatened coastal cities.

### 📡 Live News Ticker
A bottom-bar ticker streams 30+ real-world climate headlines with emoji-coded severity categories (fire 🔥, flood 🌊, storm 🌀, heat 🌡, ice 🧊, etc.).

### 🕐 Controls & UX
- UTC clock in the topbar
- Hand-tool toggle for grab / default cursor modes
- Zoom (+/−) and globe-reset buttons
- Global search bar (region, signal, climate event)

---

## 🛠 Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | React 18 + Vite 8 |
| 3-D Globe | `react-globe.gl` + Three.js r184 |
| Shaders | Custom GLSL `ShaderMaterial` (Simplex noise, 5-octave fbm) |
| GeoJSON | `world.geo.json` — 240+ country polygons for land masking |
| State | Zustand v5 |
| Animation | Framer Motion v11 |
| Charts | Recharts |
| Icons | Lucide React |
| Styling | Tailwind CSS v4 |

---

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/your-username/earth-2100.git
cd earth-2100

# Install
npm install          # or: bun install

# Dev server
npm run dev          # → http://localhost:5173

# Production build
npm run build
```

> **Node ≥ 18** required. Tested with Bun 1.x and Node 20.x.

---

## 📁 Project Structure

```
earth-2100/
├── geojson/
│   └── world.geo.json/       # 240+ country boundary files
├── src/
│   ├── components/
│   │   ├── Globe/            # EarthGlobe.jsx — WebGL globe + GLSL shaders
│   │   ├── Signals/          # Signal toggle panel
│   │   ├── Sidebar/          # ClimateInspector region detail drawer
│   │   ├── Futures/          # PlanetaryFutures scenario drawer
│   │   ├── Events/           # EarthEvents panel
│   │   ├── Ticker/           # NewsTicker bottom bar
│   │   └── Topbar/           # Navigation / search / UTC clock
│   ├── data/
│   │   ├── hotspots.js       # 20+ annotated regional hotspot objects
│   │   └── events.js         # News ticker headlines
│   └── store/
│       └── useClimateStore.js # Zustand global state
└── index.html
```

---

## 🎨 Design Philosophy

- **Dark-first** — deep navy `#020611` base keeps focus on the glowing globe
- **Screen-blend hotspots** — additive/screen blending makes overlays feel like real emissions rather than flat paint
- **GLSL over CSS** — heat stress, turbulence, and breathing effects run entirely on the GPU
- **Signal exclusivity** — only one climate signal active at a time to avoid visual noise
- **Data storytelling** — every number shown (severity scores, temperature anomalies, population counts) is grounded in IPCC / NASA / NOAA public data

---

## 📄 License

MIT — free to use, fork, and extend.

---

*Built with urgency. The data is real. The clock is ticking.*
