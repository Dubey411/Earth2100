import { useEffect } from 'react'
import Topbar          from './components/Topbar/Topbar.jsx'
import GlobeContainer  from './components/Globe/GlobeContainer.jsx'
import ClimateSignals  from './components/Signals/ClimateSignals.jsx'
import PlanetaryFutures from './components/Futures/PlanetaryFutures.jsx'
import NewsTicker      from './components/Ticker/NewsTicker.jsx'
import useAuthStore    from './store/useAuthStore.js'

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [initAuth]);

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

      {/* ── Bottom drawer: Planetary Futures ── */}
      <PlanetaryFutures />

      {/* ── Bottom ticker ── */}
      <NewsTicker />
    </div>
  )
}
