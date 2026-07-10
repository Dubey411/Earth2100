/**
 * ElNinoLayer/index.jsx — El Niño / La Niña Simulation Coordinator.
 *
 * Real-time integration:
 *   On mount, fetches the current ENSO phase from NOAA's Oceanic Niño Index (ONI).
 *   The ONI value anchors the animation at the correct point in the 24-second timeline.
 *   A ±1.5s breathing oscillation keeps the visualization alive.
 *
 * Timeline (24-second reference):
 *   0–4s   Normal / La Niña   (strong trade winds, active upwelling, West warm pool)
 *   4–10s  El Niño developing  (winds weaken, warm pool starts east shift)
 *   10–18s El Niño peak        (rain/clouds over East Pacific, upwelling shut down)
 *   18–24s Recovery to Normal
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import SeaSurfaceTemperature from './SeaSurfaceTemperature'
import OceanCurrents        from './OceanCurrents'
import TradeWinds           from './TradeWinds'
import CloudLayer           from './CloudLayer'
import RainLayer            from './RainLayer'
import UpwellingLayer       from './UpwellingLayer'
import PressureLayer        from './PressureLayer'
import Labels               from './Labels'
import { fetchENSOPhase }   from './fetchENSOPhase'

// Breathing oscillation: ±OSCILLATION_AMP seconds around the baseEnsoTime
const OSCILLATION_AMP  = 1.5  // seconds
const OSCILLATION_FREQ = 0.12 // cycles/second (one full breath every ~8s)

export default function ElNinoLayer({ globe, scene, maskTexture }) {
  const animatedRef   = useRef([])
  const [selectedInfo, setSelectedInfo] = useState(null)

  // NOAA real-time state
  const [noaaData, setNoaaData]     = useState(null)   // { phase, oni, label, color, year, season, source }
  const [noaaLoading, setNoaaLoading] = useState(true)
  const baseTimeRef = useRef(2.0)  // default neutral — overwritten once NOAA data arrives

  const registerAnimated = useCallback((fn) => {
    animatedRef.current.push(fn)
    return () => { animatedRef.current = animatedRef.current.filter(f => f !== fn) }
  }, [])

  // ── 🌐 Fetch real NOAA ONI data on mount ──────────────────────────────────
  useEffect(() => {
    setNoaaLoading(true)
    fetchENSOPhase()
      .then((data) => {
        setNoaaData(data)
        baseTimeRef.current = data.baseEnsoTime
        console.info(
          `[ENSO] Real-time phase: ${data.label} | ONI: ${data.oni > 0 ? '+' : ''}${data.oni}°C | ` +
          `Season: ${data.season} ${data.year} | Source: ${data.source}`
        )
      })
      .catch((err) => {
        console.error('[ENSO] Fetch error:', err)
      })
      .finally(() => setNoaaLoading(false))
  }, [])

  // ── 🔄 Animation loop anchored to real ENSO state ─────────────────────────
  useEffect(() => {
    const startMs = performance.now()
    let rafId

    const tick = () => {
      const realSecs = (performance.now() - startMs) / 1000
      // Breathing oscillation around the NOAA-derived base time
      const oscillation = Math.sin(realSecs * OSCILLATION_FREQ * 2 * Math.PI) * OSCILLATION_AMP
      // Keep within [0, 24)
      const currentEnsoTime = ((baseTimeRef.current + oscillation) % 24 + 24) % 24

      const fns = animatedRef.current
      for (let i = 0; i < fns.length; i++) {
        fns[i](currentEnsoTime)
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // ── 🎥 Camera positioning on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!globe) return
    globe.pointOfView({ lat: 0, lng: -140, altitude: 1.72 }, 1500)
    return () => {
      const pov2 = globe.pointOfView()
      globe.pointOfView({ ...pov2, altitude: 2.2 }, 1000)
    }
  }, [globe])

  // ── 🎯 Click Raycasting Handler ───────────────────────────────────────────
  useEffect(() => {
    if (!globe) return
    const canvas    = globe.renderer().domElement
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    const onClick = (e) => {
      const camera = globe.camera()
      if (!camera) return

      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      const targets = []
      scene.traverse((obj) => {
        if ((obj.isMesh || obj.isPoints) && obj.userData?.ensoType) {
          targets.push(obj)
        }
      })

      const intersects = raycaster.intersectObjects(targets)
      if (intersects.length > 0) {
        const { ensoType, name, desc } = intersects[0].object.userData
        setSelectedInfo({ type: ensoType, name, desc })
      } else {
        setSelectedInfo(null)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [globe, scene])

  // ── Phase badge helpers ────────────────────────────────────────────────────
  const phaseBadgeColor = noaaData?.color ?? '#64748b'
  const phaseLabel      = noaaLoading ? 'Fetching NOAA data…' : (noaaData?.label ?? 'Unknown')
  const oniStr          = noaaData ? `ONI: ${noaaData.oni > 0 ? '+' : ''}${noaaData.oni.toFixed(2)}°C` : ''
  const seasonStr       = noaaData ? `${noaaData.season} ${noaaData.year}` : ''

  return (
    <>
      <SeaSurfaceTemperature scene={scene} maskTexture={maskTexture} registerAnimated={registerAnimated} />
      <OceanCurrents  scene={scene} registerAnimated={registerAnimated} />
      <TradeWinds     scene={scene} registerAnimated={registerAnimated} />
      <CloudLayer     scene={scene} registerAnimated={registerAnimated} />
      <RainLayer      globe={globe} scene={scene} registerAnimated={registerAnimated} />
      <UpwellingLayer globe={globe} scene={scene} registerAnimated={registerAnimated} />
      <PressureLayer  scene={scene} registerAnimated={registerAnimated} />
      <Labels         globe={globe} scene={scene} registerAnimated={registerAnimated} />

      {/* ── Real-time NOAA Status Badge ─────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(5, 12, 26, 0.90)',
        border: `1px solid ${phaseBadgeColor}55`,
        boxShadow: `0 0 18px ${phaseBadgeColor}22, inset 0 0 8px ${phaseBadgeColor}0a`,
        borderRadius: '20px',
        padding: '6px 14px',
        zIndex: 9990,
        backdropFilter: 'blur(10px)',
        fontFamily: '"Outfit","Inter",sans-serif',
        animation: 'ensoSlideDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        pointerEvents: 'none',
      }}>
        {/* Live indicator dot */}
        <div style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: noaaLoading ? '#94a3b8' : phaseBadgeColor,
          boxShadow: noaaLoading ? 'none' : `0 0 8px ${phaseBadgeColor}`,
          animation: noaaLoading ? 'none' : 'ensoPulse 2s ease-in-out infinite',
          flexShrink: 0,
        }} />

        {/* Text */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '7px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: '#64748b',
            }}>
              NOAA · LIVE
            </span>
            {!noaaLoading && noaaData?.source !== 'fallback' && (
              <span style={{
                fontSize: '6.5px',
                fontWeight: 700,
                color: '#22c55e',
                background: '#052e16',
                border: '1px solid #16a34a44',
                borderRadius: '3px',
                padding: '1px 4px',
                letterSpacing: '0.6px',
              }}>
                LIVE
              </span>
            )}
            {!noaaLoading && noaaData?.source === 'fallback' && (
              <span style={{
                fontSize: '6.5px',
                fontWeight: 700,
                color: '#94a3b8',
                background: '#1e293b',
                border: '1px solid #33405555',
                borderRadius: '3px',
                padding: '1px 4px',
              }}>
                ESTIMATED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: phaseBadgeColor,
              letterSpacing: '0.02em',
            }}>
              {phaseLabel}
            </span>
            {oniStr && (
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                {oniStr}
              </span>
            )}
            {seasonStr && (
              <span style={{ fontSize: '8px', color: '#475569' }}>
                · {seasonStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Click Info Panel ─────────────────────────────────────────────── */}
      {selectedInfo && (
        <div style={{
          position: 'absolute',
          top: '118px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5, 14, 28, 0.94)',
          border: '1px solid rgba(255, 140, 0, 0.5)',
          boxShadow: '0 0 20px rgba(255, 140, 0, 0.2), inset 0 0 10px rgba(255, 140, 0, 0.08)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#e2e8f0',
          fontFamily: '"Outfit","Inter",sans-serif',
          backdropFilter: 'blur(8px)',
          width: '230px',
          zIndex: 9999,
          animation: 'ensoSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.0px', color: '#ff8c00' }}>
              ENSO Layer
            </span>
            <button
              onClick={() => setSelectedInfo(null)}
              style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: '0', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
            {selectedInfo.name}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#a0aec0', lineHeight: 1.35 }}>
            {selectedInfo.desc}
          </p>
        </div>
      )}

      <style>{`
        @keyframes ensoSlideDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes ensoPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </>
  )
}
