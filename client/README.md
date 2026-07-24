# 🌍 Earth 2100 — Frontend Client

This directory contains the React 18 + Vite frontend for **Earth 2100**, an interactive 3D WebGL Earth intelligence platform.

> Refer to the main [Root README.md](../README.md) for full project documentation, architecture, and feature screenshot gallery.

---

## 📸 Demo Screenshots

*Place feature screenshots in `../docs/images/`*:
- `../docs/images/default-earth.png` — Default 3D Globe View
- `../docs/images/signal-heat-stress.png` — Heat Stress Shader
- `../docs/images/signal-flood-risk.png` — GDACS Live Flood Beams
- `../docs/images/signal-storms.png` — GDACS Cyclone Vortices
- `../docs/images/signal-solar-storm.png` — Solar Flares & Auroras
- `../docs/images/layers-panel.png` — Layer Manager
- `../docs/images/timeline-slider.png` — Planetary Futures (2025–2100)
- `../docs/images/hotspot-inspector.png` — Regional Hotspot Inspector

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install    # or: bun install

# Start development server
npm run dev    # http://localhost:5173

# Build for production
npm run build
```

---

## 🛠 Technology Stack

* **UI Framework**: React 18 + Vite 5
* **3D Engine**: `react-globe.gl` + Three.js (r184)
* **Shaders**: Custom GLSL ShaderMaterials (Simplex Noise, FBM)
* **State Management**: Zustand v5
* **Animations**: Framer Motion v11
* **Styling**: Tailwind CSS v4
* **Map Data**: `world.geo.json` (240+ country boundaries)
