/**
 * StormLayer/index.jsx — Storm Activity Layer Coordinator.
 *
 * Mounts GPU-driven storm animations across all major tropical cyclone basins.
 * Each storm gets:
 *   - CycloneVortex: spinning 3-arm spiral particle system
 *   - EyeWall: pulsing bright ring at the eye
 *   - LightningBolts: 40 strobing GPU particles inside cloud bands
 *   - RainBands: 800 spiraling falling rain particles
 *
 * Click any storm element → compact HUD panel with storm name + science info.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { STORM_BASINS, catToColor, catToLabel } from './constants'
import CycloneVortex  from './CycloneVortex'
import EyeWall        from './EyeWall'
import LightningBolts from './LightningBolts'
import RainBands      from './RainBands'

export default function StormLayer({ globe, scene, snapshot }) {
  const animatedRef = useRef([])
  const [selectedInfo, setSelectedInfo] = useState(null)

  const registerAnimated = useCallback((fn) => {
    animatedRef.current.push(fn)
    return () => { animatedRef.current = animatedRef.current.filter(f => f !== fn) }
  }, [])

  // ── Global RAF animation loop ──────────────────────────────────────────────
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

  // ── Click raycasting — hits vortex (Points) and eyewall (Mesh) ──────────────
  useEffect(() => {
    if (!globe) return
    const canvas    = globe.renderer().domElement
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 2.5
    const mouse = new THREE.Vector2()

    const onClick = (e) => {
      const camera = globe.camera()
      if (!camera) return

      const rect = canvas.getBoundingClientRect()
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      const targets = []
      scene.traverse((obj) => {
        if ((obj.isMesh || obj.isPoints) && obj.userData?.stormType) {
          targets.push(obj)
        }
      })

      const hits = raycaster.intersectObjects(targets)
      if (hits.length > 0) {
        const { name, desc, stormId } = hits[0].object.userData
        const storm = STORM_BASINS.find(s => s.id === stormId)
        setSelectedInfo({ name, desc, storm })
      } else {
        setSelectedInfo(null)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [globe, scene])

  // ── Track screen position of active selected storm for HUD placement ────────
  const [hudPos, setHudPos] = useState({ x: '50%', y: '75px' })
  const sizeRef = useRef({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const resize = () => { sizeRef.current = { w: window.innerWidth, h: window.innerHeight } }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <>
      {/* Mount all storm sub-components */}
      {STORM_BASINS.map((storm) => (
        <React.Fragment key={storm.id}>
          <RainBands
            scene={scene}
            storm={storm}
            registerAnimated={registerAnimated}
          />
          <CycloneVortex
            scene={scene}
            storm={storm}
            registerAnimated={registerAnimated}
          />
          <EyeWall
            scene={scene}
            storm={storm}
            registerAnimated={registerAnimated}
          />
          <LightningBolts
            scene={scene}
            storm={storm}
            registerAnimated={registerAnimated}
          />
        </React.Fragment>
      ))}

      {/* ── Storm Activity Status Badge ─────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(10, 6, 28, 0.90)',
        border: '1px solid rgba(204, 102, 255, 0.40)',
        boxShadow: '0 0 20px rgba(204,102,255,0.15), inset 0 0 10px rgba(204,102,255,0.06)',
        borderRadius: '20px',
        padding: '6px 14px',
        zIndex: 9990,
        backdropFilter: 'blur(10px)',
        fontFamily: '"Outfit","Inter",sans-serif',
        animation: 'stormSlide 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#cc66ff',
          boxShadow: '0 0 8px #cc66ff',
          animation: 'stormPulse 1.4s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b' }}>
            GLOBAL STORM TRACKER
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#cc66ff' }}>
              {STORM_BASINS.length} Active Cyclones
            </span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
              · Click a storm to inspect
            </span>
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
          background: 'rgba(10, 4, 24, 0.95)',
          border: `1px solid ${catToColor(selectedInfo.storm?.cat ?? 3)}66`,
          boxShadow: `0 0 22px ${catToColor(selectedInfo.storm?.cat ?? 3)}22`,
          borderRadius: '10px',
          padding: '10px 14px',
          color: '#e2e8f0',
          fontFamily: '"Outfit","Inter",sans-serif',
          backdropFilter: 'blur(10px)',
          width: '240px',
          zIndex: 9999,
          animation: 'stormSlide 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{
              fontSize: '7px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.1px',
              color: catToColor(selectedInfo.storm?.cat ?? 3),
            }}>
              {catToLabel(selectedInfo.storm?.cat ?? 3)}
            </span>
            <button
              onClick={() => setSelectedInfo(null)}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '12px', padding: 0 }}
            >✕</button>
          </div>
          <h3 style={{ margin: '0 0 5px', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
            {selectedInfo.name.split('—')[0].trim()}
          </h3>
          <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8', lineHeight: 1.4 }}>
            {selectedInfo.desc}
          </p>
          {selectedInfo.storm && (
            <div style={{
              display: 'flex',
              gap: '6px',
              marginTop: '8px',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'CAT', val: selectedInfo.storm.cat },
                { label: 'LAT', val: `${Math.abs(selectedInfo.storm.lat).toFixed(1)}°${selectedInfo.storm.lat >= 0 ? 'N' : 'S'}` },
                { label: 'LNG', val: `${Math.abs(selectedInfo.storm.lng).toFixed(1)}°${selectedInfo.storm.lng >= 0 ? 'E' : 'W'}` },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  padding: '3px 7px',
                  fontSize: '8.5px',
                }}>
                  <span style={{ color: '#64748b', marginRight: '4px' }}>{label}</span>
                  <span style={{ color: catToColor(selectedInfo.storm.cat), fontWeight: 700 }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes stormSlide {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes stormPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </>
  )
}
