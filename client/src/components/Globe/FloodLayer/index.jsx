/**
 * FloodLayer/index.jsx — Flood Risk animation coordinator (v5).
 *
 * Stack:
 *  1. FloodPulse   — Bright additive glow blobs on the globe surface
 *  2. FloodBeams   — Vertical light columns rising from each hotspot (3D instanced, driven by Open-Meteo weather)
 *  3. FloodRings   — Expanding cyan shock rings (UV shader, unrolled)
 *  4. StormVeil    — Dark storm atmosphere over flood zones (modulated by GPM IMERG)
 *  5. Lightning    — PointLight flashes
 *
 * Real-time data:
 *  🌊 GDACS (gdacsapi): live tropical flood events (FL type) — primary source
 *  📍 Static FLOOD_HOTSPOTS: fallback if GDACS returns no events
 *  🌧️ Open-Meteo: real-time precipitation stats per hotspot
 *  🛰️ NASA GPM IMERG: precipitation texture overlay
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import FloodPulse  from './FloodPulse'
import FloodBeams  from './FloodBeams'
import FloodRings  from './FloodRings'
import StormVeil   from './StormVeil'
import Lightning   from './Lightning'
import { getDynamicPrecipitationMapUrl, FLOOD_HOTSPOTS, HOTSPOT_INFO, fetchLiveFloods } from './constants'

// Normalize static FLOOD_HOTSPOTS ([lat, lng] tuples) → object form
const STATIC_HOTSPOTS = FLOOD_HOTSPOTS.map(([lat, lng], i) => ({
  lat,
  lng,
  label: HOTSPOT_INFO[i]?.label ?? `Flood Region ${i + 1}`,
  id:    `static-fl-${i}`,
}))

export default function FloodLayer({ globe, scene, maskTexture }) {
  const lightningRef = useRef({ value: 0.0 })
  const animatedRef  = useRef([])

  const [precipTexture, setPrecipTexture] = useState(null)
  const [realtimeData,  setRealtimeData]  = useState([])
  const [selectedInfo,  setSelectedInfo]  = useState(null)

  // ── Live hotspot state (swapped to GDACS data when available) ─────────────
  const [hotspots, setHotspots] = useState(STATIC_HOTSPOTS)
  const [isLive,   setIsLive]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  const registerAnimated = useCallback((fn) => {
    animatedRef.current.push(fn)
    return () => { animatedRef.current = animatedRef.current.filter(f => f !== fn) }
  }, [])

  // ── 🌊 Fetch live flood events from GDACS ─────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetchLiveFloods().then((live) => {
      if (live && live.length > 0) {
        // Normalize GDACS events to { lat, lng, label, id } and cap at 10
        const normalized = live.slice(0, 10).map(f => ({
          lat:   f.lat,
          lng:   f.lng,
          label: f.label,
          id:    f.id,
        }))
        setHotspots(normalized)
        setIsLive(true)
        console.info(`[FloodLayer] GDACS LIVE: ${normalized.length} active flood events loaded.`)
      } else {
        console.info('[FloodLayer] GDACS returned no active floods → using static fallback hotspots.')
      }
      setLoading(false)
    })
  }, [])

  // ── 🛰️ Load NASA GPM IMERG Precipitation Texture ─────────────────────────
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
    return () => { if (tex) tex.dispose() }
  }, [])

  // ── 📊 Fetch Real-Time weather stats from Open-Meteo (re-runs on new hotspots) ──
  useEffect(() => {
    if (hotspots.length === 0) return
    const fetchWeather = async () => {
      try {
        console.log(`📊 Open-Meteo: Fetching live weather for ${hotspots.length} flood hotspot(s)...`)
        const promises = hotspots.slice(0, 10).map(async (h, idx) => {
          const res  = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${h.lat}&longitude=${h.lng}&current=precipitation,rain,cloud_cover`
          )
          const json = await res.json()
          return {
            index:         idx,
            lat:           h.lat,
            lng:           h.lng,
            label:         h.label,
            precipitation: json.current?.precipitation ?? 0.0,
            rain:          json.current?.rain          ?? 0.0,
            cloudCover:    json.current?.cloud_cover   ?? 0.0,
          }
        })
        const results = await Promise.all(promises)
        setRealtimeData(results)
        console.log('📊 Open-Meteo: Live weather data loaded:', results)
      } catch (err) {
        console.warn('📊 Open-Meteo: Failed to load weather stats, using simulation fallbacks:', err)
      }
    }
    fetchWeather()
  }, [hotspots])

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
    const canvas    = globe.renderer().domElement
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    const onClick = (e) => {
      const camera = globe.camera()
      if (!camera) return

      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      const targets = []
      scene.traverse((obj) => {
        if (obj.isMesh && obj.userData && obj.userData.floodType) targets.push(obj)
      })

      const intersects = raycaster.intersectObjects(targets)
      if (intersects.length > 0) {
        const hit = intersects[0]
        const { floodType, name, index } = hit.object.userData

        let desc = ''
        let liveStats = null

        if (typeof index === 'number' && hotspots[index]) {
          const h       = hotspots[index]
          const weather = realtimeData[index]
          liveStats = {
            region: h.label,
            lat:    h.lat,
            lng:    h.lng,
            rain:   weather ? `${weather.precipitation.toFixed(1)} mm/hr` : 'Fetching...',
            clouds: weather ? `${weather.cloudCover}%` : 'Fetching...',
            source: isLive ? 'GDACS · Live' : 'Static Baseline',
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
        setSelectedInfo(null)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [globe, scene, realtimeData, hotspots, isLive])

  return (
    <>
      <FloodPulse
        scene={scene}
        maskTexture={maskTexture}
        registerAnimated={registerAnimated}
        hotspots={hotspots}
      />
      <FloodBeams
        globe={globe}
        scene={scene}
        realtimeData={realtimeData}
        registerAnimated={registerAnimated}
        hotspots={hotspots}
      />
      <FloodRings
        scene={scene}
        registerAnimated={registerAnimated}
        hotspots={hotspots}
      />
      <StormVeil
        scene={scene}
        lightningRef={lightningRef}
        precipTexture={precipTexture}
        registerAnimated={registerAnimated}
        hotspots={hotspots}
      />
      <Lightning
        globe={globe}
        scene={scene}
        lightningRef={lightningRef}
        registerAnimated={registerAnimated}
      />

      {/* ── GDACS / Static Status Badge ──────────────────────────────────── */}
      <div style={{
        position:       'absolute',
        top:            '72px',
        left:           '50%',
        transform:      'translateX(-50%)',
        display:        'flex',
        alignItems:     'center',
        gap:            '8px',
        background:     'rgba(5, 14, 28, 0.90)',
        border:         `1px solid ${isLive ? 'rgba(0, 229, 255, 0.40)' : 'rgba(0, 150, 200, 0.40)'}`,
        boxShadow:      `0 0 20px ${isLive ? 'rgba(0,229,255,0.15)' : 'rgba(0,150,200,0.15)'}, inset 0 0 10px rgba(0,229,255,0.06)`,
        borderRadius:   '20px',
        padding:        '6px 14px',
        zIndex:         9990,
        backdropFilter: 'blur(10px)',
        fontFamily:     '"Outfit","Inter",sans-serif',
        animation:      'floodSlide 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        pointerEvents:  'none',
      }}>
        <div style={{
          width:        '7px',
          height:       '7px',
          borderRadius: '50%',
          background:   isLive ? '#00e5ff' : '#0096c8',
          boxShadow:    `0 0 8px ${isLive ? '#00e5ff' : '#0096c8'}`,
          animation:    'floodPulse 1.4s ease-in-out infinite',
          flexShrink:   0,
        }} />
        <div>
          <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b' }}>
            {isLive ? 'GDACS · LIVE FLOOD FEED' : 'STATIC FALLBACK BASINS'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: isLive ? '#00e5ff' : '#0096c8' }}>
              {loading ? 'Scanning active floods…' : `${hotspots.length} Active Flood Zone${hotspots.length !== 1 ? 's' : ''}`}
            </span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
              · Click to inspect details
            </span>
          </div>
        </div>
      </div>

      {/* ── Click Info Panel ─────────────────────────────────────────────── */}
      {selectedInfo && (
        <div style={{
          position:       'absolute',
          top:            '118px',
          left:           '50%',
          transform:      'translateX(-50%)',
          background:     'rgba(5, 14, 28, 0.94)',
          border:         '1px solid rgba(0, 229, 255, 0.5)',
          boxShadow:      '0 0 20px rgba(0, 229, 255, 0.2), inset 0 0 10px rgba(0, 229, 255, 0.08)',
          borderRadius:   '8px',
          padding:        '10px 14px',
          color:          '#e2e8f0',
          fontFamily:     '"Outfit", "Inter", sans-serif',
          backdropFilter: 'blur(8px)',
          width:          '230px',
          zIndex:         9999,
          animation:      'floodSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.0px', color: '#00e5ff' }}>
              Instrument Identified
            </span>
            <button
              onClick={() => setSelectedInfo(null)}
              style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: '0', lineHeight: 1 }}
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

          {selectedInfo.liveStats && (
            <div style={{
              marginTop:  '6px',
              paddingTop: '6px',
              borderTop:  '1px solid rgba(0, 229, 255, 0.25)',
              fontSize:   '9.5px',
              fontFamily: 'monospace',
              color:      '#00e5ff',
              lineHeight: '1.5',
            }}>
              <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '2px' }}>📍 {selectedInfo.liveStats.region}</div>
              <div>📡 COORDS: {Number(selectedInfo.liveStats.lat).toFixed(2)}°N, {Number(selectedInfo.liveStats.lng).toFixed(2)}°E</div>
              <div>🌧️ RAIN: {selectedInfo.liveStats.rain}</div>
              <div>☁️ CLOUDS: {selectedInfo.liveStats.clouds}</div>
              <div style={{ marginTop: '3px', fontSize: '8px', color: '#4a90a4' }}>📶 SRC: {selectedInfo.liveStats.source}</div>
            </div>
          )}

          <style>{`
            @keyframes floodSlideDown {
              from { opacity: 0; transform: translate(-50%, -10px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
            }
            @keyframes floodSlide {
              from { opacity: 0; transform: translate(-50%, -8px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
            }
            @keyframes floodPulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%       { opacity: 0.4; transform: scale(0.7); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}