/**
 * SolarStormLayer/index.jsx — Solar Storm Simulation Coordinator.
 *
 * Visualizes:
 *   1. Northern & Southern lights (AuroraShader)
 *   2. Flowing solar wind particles curving towards the poles (SolarParticles)
 *   3. Compressed magnetosphere shock bubble (Magnetosphere)
 *
 * State:
 *   - Fetches signal intensity from useClimateStore to scale the auroral
 *     glow, particle flow speeds, and magnetosphere compression level.
 */
import React, { useEffect, useRef, useCallback } from 'react'
import useClimateStore from '../../../store/useClimateStore'
import AuroraShader   from './AuroraShader'
import SolarParticles from './SolarParticles'
import Magnetosphere  from './Magnetosphere'

export default function SolarStormLayer({ globe, scene }) {
  const animatedRef = useRef([])

  const registerAnimated = useCallback((fn) => {
    animatedRef.current.push(fn)
    return () => { animatedRef.current = animatedRef.current.filter(f => f !== fn) }
  }, [])

  // ── 🔄 Global RAF Loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const startMs = performance.now()
    let rafId
    const tick = () => {
      const t = (performance.now() - startMs) / 1000
      const fns = animatedRef.current
      for (let i = 0; i < fns.length; i++) fns[i](t)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Read current intensity from the store (default to 0.6 if not set)
  const intensity = useClimateStore((s) => s.signalIntensity.solar ?? 0.6)

  // Determine space weather geomagnetic alert level based on slider value
  let stormClass = 'G1 Minor'
  let stormColor = '#a855f7' // purple
  if (intensity > 0.3) {
    stormClass = 'G2 Moderate'
    stormColor = '#eab308' // yellow
  }
  if (intensity > 0.6) {
    stormClass = 'G4 Severe'
    stormColor = '#f97316' // orange
  }
  if (intensity > 0.85) {
    stormClass = 'G5 Extreme'
    stormColor = '#ef4444' // red
  }

  return (
    <>
      <AuroraShader
        scene={scene}
        intensity={intensity}
        registerAnimated={registerAnimated}
      />
      <SolarParticles
        scene={scene}
        intensity={intensity}
        registerAnimated={registerAnimated}
      />
      <Magnetosphere
        scene={scene}
        intensity={intensity}
        registerAnimated={registerAnimated}
      />

      {/* ── Solar Storm Status Badge ───────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(26, 12, 6, 0.90)',
        border: `1px solid ${stormColor}55`,
        boxShadow: `0 0 20px ${stormColor}22, inset 0 0 10px ${stormColor}0c`,
        borderRadius: '20px',
        padding: '6px 14px',
        zIndex: 9990,
        backdropFilter: 'blur(10px)',
        fontFamily: '"Outfit","Inter",sans-serif',
        animation: 'solarSlide 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: stormColor,
          boxShadow: `0 0 8px ${stormColor}`,
          animation: 'solarPulse 1.2s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b' }}>
            GEOMAGNETIC STORM MONITOR
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: stormColor }}>
              {stormClass} Space Alert
            </span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
              · Solar wind index: {Math.round(intensity * 10)}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes solarSlide {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes solarPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.85); }
        }
      `}</style>
    </>
  )
}
