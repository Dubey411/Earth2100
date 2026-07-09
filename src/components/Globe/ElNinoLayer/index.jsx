/**
 * ElNinoLayer/index.jsx — El Niño / La Niña Simulation Coordinator.
 *
 * Drives a unified 24-second timeline loop that simulates the transition 
 * from Normal Pacific conditions to El Niño and back.
 *
 * Timeline (24-second loop):
 *   - 0.0s – 4.0s: Normal State (Westward winds, Peru upwelling, West warm pool)
 *   - 4.0s – 10.0s: Transition (Trade winds weaken, upwelling shuts down, warm pool moves East)
 *   - 10.0s – 18.0s: El Niño Peak (Eastward currents, rain shifts East, drought in West, flood in East)
 *   - 18.0s – 24.0s: Transition back to Normal
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import SeaSurfaceTemperature from './SeaSurfaceTemperature'
import OceanCurrents          from './OceanCurrents'
import TradeWinds            from './TradeWinds'
import CloudLayer            from './CloudLayer'
import RainLayer             from './RainLayer'
import UpwellingLayer        from './UpwellingLayer'
import PressureLayer         from './PressureLayer'
import Labels                from './Labels'

export default function ElNinoLayer({ globe, scene, maskTexture }) {
  const animatedRef = useRef([])
  const [ensoTime, setEnsoTime] = useState(0.0)
  const [selectedInfo, setSelectedInfo] = useState(null)

  const registerAnimated = useCallback((fn) => {
    animatedRef.current.push(fn)
    return () => { animatedRef.current = animatedRef.current.filter(f => f !== fn) }
  }, [])

  // ── 🔄 Unified timeline loop (24-second cycle) ─────────────────────────────
  useEffect(() => {
    const startMs = performance.now()
    let rafId

    const tick = () => {
      const elapsed = (performance.now() - startMs) / 1000
      const currentEnsoTime = elapsed % 24.0
      setEnsoTime(currentEnsoTime)

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
    // Smoothly pan & zoom to center on the Pacific Equatorial belt
    const pov = globe.pointOfView()
    globe.pointOfView({ lat: 0, lng: -140, altitude: 1.72 }, 1500)
    return () => {
      const pov2 = globe.pointOfView()
      globe.pointOfView({ ...pov2, altitude: 2.2 }, 1000)
    }
  }, [globe])

  // ── 🎯 Click Raycasting Handler ───────────────────────────────────────────
  useEffect(() => {
    if (!globe) return
    const canvas = globe.renderer().domElement
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onClick = (e) => {
      const camera = globe.camera()
      if (!camera) return

      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      const targets = []
      scene.traverse((obj) => {
        if ((obj.isMesh || obj.isPoints) && obj.userData && obj.userData.ensoType) {
          targets.push(obj)
        }
      })

      const intersects = raycaster.intersectObjects(targets)
      if (intersects.length > 0) {
        const hit = intersects[0]
        const { ensoType, name, desc } = hit.object.userData
        setSelectedInfo({ type: ensoType, name, desc })
      } else {
        setSelectedInfo(null)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [globe, scene])

  return (
    <>
      <SeaSurfaceTemperature
        scene={scene}
        maskTexture={maskTexture}
        registerAnimated={registerAnimated}
      />
      <OceanCurrents
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <TradeWinds
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <CloudLayer
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <RainLayer
        globe={globe}
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <UpwellingLayer
        globe={globe}
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <PressureLayer
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <Labels
        globe={globe}
        scene={scene}
        registerAnimated={registerAnimated}
      />

      {/* Cybernetic Readout Overlay Panel */}
      {selectedInfo && (
        <div style={{
          position: 'absolute',
          top: '75px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5, 14, 28, 0.94)',
          border: '1px solid rgba(255, 140, 0, 0.5)', // Orange cybernetic accent for ENSO
          boxShadow: '0 0 20px rgba(255, 140, 0, 0.2), inset 0 0 10px rgba(255, 140, 0, 0.08)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#e2e8f0',
          fontFamily: '"Outfit", "Inter", sans-serif',
          backdropFilter: 'blur(8px)',
          width: '230px',
          zIndex: 9999,
          animation: 'ensoSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.0px', color: '#ff8c00' }}>
              ENSO Layer Detected
            </span>
            <button 
              onClick={() => setSelectedInfo(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#718096',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                padding: '0',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.1px' }}>
            {selectedInfo.name}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#a0aec0', lineHeight: 1.35 }}>
            {selectedInfo.desc}
          </p>

          <style>{`
            @keyframes ensoSlideDown {
              from { opacity: 0; transform: translate(-50%, -10px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
