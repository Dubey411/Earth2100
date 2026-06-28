import Topbar          from './components/Topbar/Topbar.jsx'
import GlobeContainer  from './components/Globe/GlobeContainer.jsx'
import ClimateSignals  from './components/Signals/ClimateSignals.jsx'
import EarthEvents     from './components/Events/EarthEvents.jsx'
import ClimateInspector from './components/Sidebar/ClimateInspector.jsx'
import PlanetaryFutures from './components/Futures/PlanetaryFutures.jsx'
import NewsTicker      from './components/Ticker/NewsTicker.jsx'

export default function App() {
  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none"
      style={{ background: '#020611' }}
    >
      {/* ── Deep-space ambient gradients ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%,  rgba(8,80,148,0.28)  0%, transparent 65%),
            radial-gradient(ellipse 40% 40% at 78% 18%,  rgba(0,160,255,0.10) 0%, transparent 50%),
            radial-gradient(ellipse 35% 35% at 22% 82%,  rgba(0,200,140,0.07) 0%, transparent 48%),
            radial-gradient(ellipse 25% 25% at 88% 80%,  rgba(80,0,180,0.06)  0%, transparent 45%)
          `,
        }}
      />

      {/* ── Subtle edge vignette ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 50%,
              transparent 55%,
              rgba(2,6,17,0.55) 100%)
          `,
        }}
      />

      {/* ── Globe (full-screen, z-10) ── */}
      <div className="absolute inset-0 z-10">
        <GlobeContainer />
      </div>

      {/* ── Topbar ── */}
      <Topbar />

      {/* ── Left rail: Climate Signals ── */}
      <ClimateSignals />

      {/* ── Top-right: Earth Events ── */}
      <EarthEvents />

      {/* ── Right: Climate Inspector sidebar ── */}
      <ClimateInspector />

      {/* ── Bottom drawer: Planetary Futures ── */}
      <PlanetaryFutures />

      {/* ── Bottom ticker ── */}
      <NewsTicker />
    </div>
  )
}
