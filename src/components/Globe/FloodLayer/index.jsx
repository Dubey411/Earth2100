/**
 * FloodLayer/index.jsx — Flood Risk animation coordinator (v4).
 *
 * Stack:
 *  1. FloodPulse   — Bright additive glow blobs on the globe surface
 *  2. FloodBeams   — Vertical light columns rising from each hotspot (3D instanced)
 *  3. FloodRings   — Expanding cyan shock rings (UV shader, unrolled)
 *  4. StormVeil    — Dark storm atmosphere over flood zones (modulated by GPM IMERG)
 *  5. Lightning    — PointLight flashes
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import FloodPulse  from './FloodPulse'
import FloodBeams  from './FloodBeams'
import FloodRings  from './FloodRings'
import StormVeil   from './StormVeil'
import Lightning   from './Lightning'
import { getDynamicPrecipitationMapUrl } from './constants'

export default function FloodLayer({ globe, scene, maskTexture }) {
  const lightningRef = useRef({ value: 0.0 })
  const animatedRef  = useRef([])

  const [precipTexture, setPrecipTexture] = useState(null)
  const [selectedInfo, setSelectedInfo] = useState(null)

  const registerAnimated = useCallback((fn) => {
    animatedRef.current.push(fn)
    return () => { animatedRef.current = animatedRef.current.filter(f => f !== fn) }
  }, [])

  // ── 🌧️ Load NASA GPM IMERG Precipitation Texture ────────────────────────
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const url = getDynamicPrecipitationMapUrl()
    console.log('🌧️ GPM IMERG: Requesting real-time precipitation WMS layer from:', url)

    const tex = loader.load(
      url,
      (loadedTex) => {
        loadedTex.wrapS = THREE.RepeatWrapping
        loadedTex.wrapT = THREE.ClampToEdgeWrapping
        setPrecipTexture(loadedTex)
        console.log('🌧️ GPM IMERG: Real-time satellite precipitation texture loaded successfully!')
      },
      undefined,
      (err) => {
        console.warn('🌧️ GPM IMERG: Failed to load precipitation feed, using high-quality procedural fallback:', err)
      }
    )

    return () => {
      if (tex) tex.dispose()
    }
  }, [])

  // ── Single shared RAF ─────────────────────────────────────────────────────
  useEffect(() => {
    const startMs = performance.now()
    let rafId
    const tick = () => {
      const t   = (performance.now() - startMs) / 1000
      const fns = animatedRef.current
      for (let i = 0; i < fns.length; i++) fns[i](t)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // ── Camera zoom ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!globe) return
    const pov = globe.pointOfView()
    globe.pointOfView({ ...pov, altitude: 1.95 }, 1200)
    return () => {
      const pov2 = globe.pointOfView()
      globe.pointOfView({ ...pov2, altitude: 2.2 }, 800)
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

      // Calculate mouse position in normalized device coordinates
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      // Traverse scene to find all custom flood meshes
      const targets = []
      scene.traverse((obj) => {
        if (obj.isMesh && obj.userData && obj.userData.floodType) {
          targets.push(obj)
        }
      })

      const intersects = raycaster.intersectObjects(targets)
      if (intersects.length > 0) {
        const hit = intersects[0]
        const { floodType, name } = hit.object.userData
        
        let desc = ''
        if (floodType === 'beam') {
          desc = 'A vertical 3D volumetric light column centered over extreme weather zones. The beam height and intensity pulse in real-time, mapping active flood risk coordinates.'
        } else if (floodType === 'ripple') {
          desc = 'Concentric shock-wave rings modeling the velocity and propagation of flash floods and surface water runoff expanding outward from storm centers.'
        } else if (floodType === 'veil') {
          desc = 'Real-time precipitation clouds generated dynamically using live NASA satellite imagery from the GPM (Global Precipitation Measurement) IMERG feed, complete with high-frequency lightning discharge simulations.'
        } else if (floodType === 'pulse') {
          desc = 'High-contrast GPU shader visualizing surface water accumulation and flood-level rise on land masses using Gerstner wave interference models.'
        }

        setSelectedInfo({ type: floodType, name, desc })
      } else {
        // Clear panel when clicking elsewhere
        setSelectedInfo(null)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [globe, scene])

  return (
    <>
      <FloodPulse
        scene={scene}
        maskTexture={maskTexture}
        registerAnimated={registerAnimated}
      />
      <FloodBeams
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <FloodRings
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <StormVeil
        scene={scene}
        lightningRef={lightningRef}
        precipTexture={precipTexture}
        registerAnimated={registerAnimated}
      />
      <Lightning
        scene={scene}
        lightningRef={lightningRef}
        registerAnimated={registerAnimated}
      />

      {/* Cybernetic Readout Overlay Panel */}
      {selectedInfo && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5, 14, 28, 0.88)',
          border: '1px solid rgba(0, 229, 255, 0.45)',
          boxShadow: '0 0 25px rgba(0, 229, 255, 0.22), inset 0 0 12px rgba(0, 229, 255, 0.08)',
          borderRadius: '10px',
          padding: '16px 20px',
          color: '#e2e8f0',
          fontFamily: '"Outfit", "Inter", sans-serif',
          backdropFilter: 'blur(10px)',
          width: '320px',
          zIndex: 9999,
          animation: 'floodSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#00e5ff' }}>
              Climate Signal Instrument
            </span>
            <button 
              onClick={() => setSelectedInfo(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#718096',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                padding: '0 4px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.2px' }}>
            {selectedInfo.name}
          </h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#a0aec0', lineHeight: 1.45 }}>
            {selectedInfo.desc}
          </p>

          <style>{`
            @keyframes floodSlideUp {
              from { opacity: 0; transform: translate(-50%, 15px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}