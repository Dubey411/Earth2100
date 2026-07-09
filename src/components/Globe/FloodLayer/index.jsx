/**
 * FloodLayer/index.jsx — Flood Risk animation coordinator (v3 complete rewrite).
 *
 * APPROACH: Use react-globe.gl's own coordinate API to position 3D objects
 * at exact hotspot locations, eliminating all UV-space alignment issues.
 *
 * Stack:
 *  1. FloodPulse   — Bright additive glow blobs on the globe surface (UV shader)
 *  2. FloodBeams   — Vertical light columns rising from each hotspot (3D instanced)
 *  3. FloodRings   — Expanding cyan shock rings (UV shader, unrolled)
 *  4. StormVeil    — Dark storm atmosphere over flood zones
 *  5. Lightning    — PointLight flashes
 *
 * Single RAF loop, shared lightningRef, camera zoom.
 */
import { useEffect, useRef, useCallback } from 'react'
import FloodPulse  from './FloodPulse'
import FloodBeams  from './FloodBeams'
import FloodRings  from './FloodRings'
import StormVeil   from './StormVeil'
import Lightning   from './Lightning'

export default function FloodLayer({ globe, scene, maskTexture }) {
  const lightningRef = useRef({ value: 0.0 })
  const animatedRef  = useRef([])

  const registerAnimated = useCallback((fn) => {
    animatedRef.current.push(fn)
    return () => { animatedRef.current = animatedRef.current.filter(f => f !== fn) }
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

  return (
    <>
      <FloodPulse   scene={scene} maskTexture={maskTexture} registerAnimated={registerAnimated} />
      <FloodBeams   scene={scene} registerAnimated={registerAnimated} />
      <FloodRings   scene={scene} registerAnimated={registerAnimated} />
      <StormVeil    scene={scene} lightningRef={lightningRef} registerAnimated={registerAnimated} />
      <Lightning    scene={scene} lightningRef={lightningRef} registerAnimated={registerAnimated} />
    </>
  )
}