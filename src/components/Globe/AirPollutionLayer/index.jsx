/**
 * AirPollutionLayer/index.jsx — Air Pollution Layer Coordinator.
 *
 * Real-time integration:
 *   🇮🇳 Delhi: CPCB (data.gov.in) — Official Ministry of Environment, India
 *               Averages PM2.5 readings from all monitoring stations in the city.
 *   🌍 Others:  Open-Meteo Air Quality API (Beijing, Jakarta, Mexico City, Lahore)
 *
 * Renders:
 *   - SmogDome: Procedural toxic haze domes tangent to the globe surface.
 *   - SootDrift: 300 rising and drifting particulate wind vectors.
 *   - Raycasting interaction: Click to display a detailed AQI readout HUD panel.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { POLLUTION_HOTSPOTS, fetchLiveAqi, getAqiCategory } from './constants'
import SmogDome  from './SmogDome'
import SootDrift from './SootDrift'

export default function AirPollutionLayer({ globe, scene }) {
  const animatedRef = useRef([])
  const [selectedInfo, setSelectedInfo] = useState(null)
  
  // Real-time AQI cache by hotspot ID
  const [liveAqiCache, setLiveAqiCache] = useState({})
  const [loading, setLoading]           = useState(true)

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

  // ── 🌐 Fetch live AQI — CPCB for India, Open-Meteo for the rest ──────────
  useEffect(() => {
    setLoading(true)
    const promises = POLLUTION_HOTSPOTS.map((hotspot) =>
      fetchLiveAqi(hotspot).then((res) => ({
        id: hotspot.id,
        data: res,
      }))
    )

    Promise.all(promises)
      .then((results) => {
        const cache = {}
        results.forEach(({ id, data }) => {
          if (data) cache[id] = data
        })
        setLiveAqiCache(cache)
      })
      .catch((err) => {
        console.error('[Pollution] Failed to load live AQI indices:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── 🎯 Click Raycasting Handler ───────────────────────────────────────────
  useEffect(() => {
    if (!globe) return
    const canvas = globe.renderer().domElement
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 2.0
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
        if ((obj.isMesh || obj.isPoints) && obj.userData?.pollutionType) {
          targets.push(obj)
        }
      })

      const intersects = raycaster.intersectObjects(targets)
      if (intersects.length > 0) {
        const { name, desc, hotspotId } = intersects[0].object.userData
        const hotspot = POLLUTION_HOTSPOTS.find(h => h.id === hotspotId)
        setSelectedInfo({ name, desc, hotspot })
      } else {
        setSelectedInfo(null)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [globe, scene])

  // Get active selected AQI data
  const selectedAqi = selectedInfo?.hotspot
    ? (liveAqiCache[selectedInfo.hotspot.id]?.aqi ?? selectedInfo.hotspot.baseAqi)
    : 100
  const selectedPm25 = selectedInfo?.hotspot
    ? (liveAqiCache[selectedInfo.hotspot.id]?.pm25 ?? 35.0)
    : 12.0
  const selectedCat = getAqiCategory(selectedAqi)

  return (
    <>
      {POLLUTION_HOTSPOTS.map((hotspot) => {
        const liveAqi = liveAqiCache[hotspot.id]
        return (
          <React.Fragment key={hotspot.id}>
            <SmogDome
              globe={globe}
              scene={scene}
              hotspot={hotspot}
              liveAqi={liveAqi}
              registerAnimated={registerAnimated}
            />
            <SootDrift
              globe={globe}
              scene={scene}
              hotspot={hotspot}
              liveAqi={liveAqi}
              registerAnimated={registerAnimated}
            />
          </React.Fragment>
        )
      })}

      {/* ── Air Quality Status Badge ───────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(12, 6, 26, 0.90)',
        border: '1px solid rgba(147, 112, 219, 0.40)',
        boxShadow: '0 0 20px rgba(147, 112, 219, 0.15), inset 0 0 10px rgba(147, 112, 219, 0.06)',
        borderRadius: '20px',
        padding: '6px 14px',
        zIndex: 9990,
        backdropFilter: 'blur(10px)',
        fontFamily: '"Outfit","Inter",sans-serif',
        animation: 'pollutionSlide 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#9370db',
          boxShadow: '0 0 8px #9370db',
          animation: 'pollutionPulse 1.6s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b' }}>
            CPCB · Open-Meteo · LIVE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#b08eee' }}>
              {loading ? 'Connecting to CPCB…' : 'AQI Plumes Active'}
            </span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
              · Real-time PM2.5 stations
            </span>
          </div>
        </div>
      </div>

      {/* ── Detailed AQI Readout HUD Panel ──────────────────────────────── */}
      {selectedInfo && (
        <div style={{
          position: 'absolute',
          top: '118px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(12, 5, 24, 0.95)',
          border: `1px solid ${selectedCat.color}66`,
          boxShadow: `0 0 22px ${selectedCat.color}22`,
          borderRadius: '10px',
          padding: '10px 14px',
          color: '#e2e8f0',
          fontFamily: '"Outfit","Inter",sans-serif',
          backdropFilter: 'blur(10px)',
          width: '240px',
          zIndex: 9999,
          animation: 'pollutionSlide 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{
              fontSize: '7.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.1px',
              color: selectedCat.color,
            }}>
              {selectedCat.label}
            </span>
            <button
              onClick={() => setSelectedInfo(null)}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '12px', padding: 0 }}
            >✕</button>
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
            {selectedInfo.hotspot.name}
          </h3>
          <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8', lineHeight: 1.4 }}>
            {selectedCat.desc}
          </p>

          {/* Sensory Readings */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '3px 7px', fontSize: '8.5px' }}>
              <span style={{ color: '#64748b', marginRight: '4px' }}>US AQI</span>
              <span style={{ color: selectedCat.color, fontWeight: 700 }}>{selectedAqi}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '3px 7px', fontSize: '8.5px' }}>
              <span style={{ color: '#64748b', marginRight: '4px' }}>PM2.5</span>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>{selectedPm25.toFixed(1)} µg/m³</span>
            </div>
            {/* Data source badge */}
            {liveAqiCache[selectedInfo.hotspot.id]?.source && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '3px 7px', fontSize: '8.5px' }}>
                <span style={{ color: '#64748b', marginRight: '4px' }}>SRC</span>
                <span style={{ color: liveAqiCache[selectedInfo.hotspot.id]?.source === 'CPCB' ? '#22c55e' : '#60a5fa', fontWeight: 700 }}>
                  {liveAqiCache[selectedInfo.hotspot.id]?.source}
                </span>
              </div>
            )}
          </div>
          {/* Station count + last update for CPCB */}
          {liveAqiCache[selectedInfo.hotspot.id]?.stationCount && (
            <div style={{ marginTop: '5px', fontSize: '8px', color: '#475569' }}>
              📡 {liveAqiCache[selectedInfo.hotspot.id].stationCount} monitoring stations · {liveAqiCache[selectedInfo.hotspot.id]?.lastUpdate}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pollutionSlide {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes pollutionPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </>
  )
}
