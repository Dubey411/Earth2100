/**
 * FloodLayer/index.jsx — Flood Risk animation coordinator (v4).
 *
 * Stack:
 *  1. FloodPulse   — Bright additive glow blobs on the globe surface
 *  2. FloodBeams   — Vertical light columns rising from each hotspot (3D instanced, driven by Open-Meteo weather)
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
import { getDynamicPrecipitationMapUrl, FLOOD_HOTSPOTS, HOTSPOT_INFO } from './constants'

export default function FloodLayer({ globe, scene, maskTexture }) {
  const lightningRef = useRef({ value: 0.0 })
  const animatedRef  = useRef([])

  const [precipTexture, setPrecipTexture] = useState(null)
  const [realtimeData, setRealtimeData] = useState([])
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

  // ── 📊 Fetch Real-Time weather stats from Open-Meteo ───────────────────────
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        console.log('📊 Open-Meteo: Fetching live weather statistics for flood hotspots...')
        const promises = FLOOD_HOTSPOTS.map(async ([lat, lng], idx) => {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,rain,cloud_cover`)
          const json = await res.json()
          return {
            index: idx,
            lat,
            lng,
            precipitation: json.current?.precipitation ?? 0.0,
            rain: json.current?.rain ?? 0.0,
            cloudCover: json.current?.cloud_cover ?? 0.0
          }
        })
        const results = await Promise.all(promises)
        setRealtimeData(results)
        console.log('📊 Open-Meteo: Live weather data successfully loaded:', results)
      } catch (err) {
        console.warn('📊 Open-Meteo: Failed to load weather stats, using simulation fallbacks:', err)
      }
    }
    fetchWeather()
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
        const { floodType, name, index } = hit.object.userData
        
        let desc = ''
        let liveStats = null

        // Get hotspot-specific metadata & weather values if available
        if (typeof index === 'number' && HOTSPOT_INFO[index]) {
          const region = HOTSPOT_INFO[index]
          const weather = realtimeData[index]
          liveStats = {
            region: region.label,
            lat: region.lat,
            lng: region.lng,
            rain: weather ? `${weather.precipitation.toFixed(1)} mm/hr` : 'Fetching...',
            clouds: weather ? `${weather.cloudCover}%` : 'Fetching...'
          }
        }

        if (floodType === 'beam') {
          desc = 'A vertical 3D volumetric light column. The beam Y-scale adjusts dynamically in real-time based on actual precipitation levels measured by the Open-Meteo Weather API.'
        } else if (floodType === 'ripple') {
          desc = 'Concentric shock-wave rings modeling the velocity and propagation of flash floods and surface water runoff expanding outward from storm centers.'
        } else if (floodType === 'veil') {
          desc = 'Real-time precipitation clouds generated dynamically using live NASA satellite imagery from the GPM (Global Precipitation Measurement) IMERG feed, complete with high-frequency lightning discharge simulations.'
        } else if (floodType === 'pulse') {
          desc = 'High-contrast GPU shader visualizing surface water accumulation and flood-level rise on land masses using Gerstner wave interference models.'
        }

        setSelectedInfo({ type: floodType, name, desc, liveStats })
      } else {
        // Clear panel when clicking elsewhere
        setSelectedInfo(null)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [globe, scene, realtimeData])

  return (
    <>
      <FloodPulse
        scene={scene}
        maskTexture={maskTexture}
        registerAnimated={registerAnimated}
      />
      <FloodBeams
        globe={globe}
        scene={scene}
        realtimeData={realtimeData}
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
        globe={globe}
        scene={scene}
        lightningRef={lightningRef}
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
          border: '1px solid rgba(0, 229, 255, 0.5)',
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.2), inset 0 0 10px rgba(0, 229, 255, 0.08)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#e2e8f0',
          fontFamily: '"Outfit", "Inter", sans-serif',
          backdropFilter: 'blur(8px)',
          width: '230px',
          zIndex: 9999,
          animation: 'floodSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.0px', color: '#00e5ff' }}>
              Instrument Identified
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
          <h3 style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.1px' }}>
            {selectedInfo.name}
          </h3>
          <p style={{ margin: '4px 0 6px 0', fontSize: '9.5px', color: '#a0aec0', lineHeight: 1.35 }}>
            {selectedInfo.desc}
          </p>

          {/* Dynamic weather API readouts */}
          {selectedInfo.liveStats && (
            <div style={{
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(0, 229, 255, 0.25)',
              fontSize: '9.5px',
              fontFamily: 'monospace',
              color: '#00e5ff',
              lineHeight: '1.5'
            }}>
              <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '2px' }}>📍 {selectedInfo.liveStats.region}</div>
              <div>📡 COORDS: {selectedInfo.liveStats.lat}°N, {selectedInfo.liveStats.lng}°E</div>
              <div>🌧️ RAIN: {selectedInfo.liveStats.rain}</div>
              <div>☁️ CLOUDS: {selectedInfo.liveStats.clouds}</div>
            </div>
          )}

          <style>{`
            @keyframes floodSlideDown {
              from { opacity: 0; transform: translate(-50%, -10px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}