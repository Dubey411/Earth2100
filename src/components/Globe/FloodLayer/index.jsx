// /**
//  * FloodLayer/index.jsx — Flood Risk animation coordinator.
//  *
//  * Mounts only when activeSignal === "Flood Risk". Unmounts cleanly.
//  *
//  * Architecture:
//  *  - One shared requestAnimationFrame loop drives ALL sub-layers.
//  *  - Each layer registers/unregisters an update callback via registerAnimated().
//  *  - Camera zooms in to altitude 1.95 on mount, restores 2.2 on unmount.
//  *  - lightningRef is shared between Lightning (writes) and Clouds (reads).
//  *
//  * Layers (render order):
//  *   4  FloodOverlay   — land water accumulation blobs
//  *   6  Clouds         — dark storm cloud sphere
//  *   7  FloodRipples   — expanding wave rings
//  *   8  RainParticles  — falling rain streaks (GPU Points)
//  *   +  Lightning      — PointLight flash (no renderOrder needed)
//  */
// import { useEffect, useRef, useCallback } from 'react'
// import Clouds        from './Clouds'
// import RainParticles from './RainParticles'
// import FloodRipples  from './FloodRipples'
// import FloodOverlay  from './FloodOverlay'
// import Lightning     from './Lightning'

// export default function FloodLayer({ globe, scene, maskTexture }) {
//   // Shared lightning signal: Lightning writes, Clouds reads
//   const lightningRef  = useRef({ value: 0.0 })

//   // Registry of per-frame update functions (one per sublayer)
//   const animatedRef   = useRef([])

//   /** Registers an animation callback and returns a cleanup (deregister) fn. */
//   const registerAnimated = useCallback((updateFn) => {
//     animatedRef.current.push(updateFn)
//     return () => {
//       animatedRef.current = animatedRef.current.filter(fn => fn !== updateFn)
//     }
//   }, [])

//   // ── Single shared RAF loop ────────────────────────────────────────────────
//   useEffect(() => {
//     const startMs = performance.now()
//     let rafId

//     const tick = () => {
//       const t = (performance.now() - startMs) / 1000   // seconds since mount
//       const fns = animatedRef.current
//       for (let i = 0; i < fns.length; i++) fns[i](t)
//       rafId = requestAnimationFrame(tick)
//     }

//     rafId = requestAnimationFrame(tick)
//     return () => cancelAnimationFrame(rafId)
//   }, [])

//   // ── Camera zoom in / out ──────────────────────────────────────────────────
//   useEffect(() => {
//     if (!globe) return

//     const pov = globe.pointOfView()
//     globe.pointOfView({ ...pov, altitude: 1.95 }, 1200)

//     return () => {
//       const pov2 = globe.pointOfView()
//       globe.pointOfView({ ...pov2, altitude: 2.2 }, 800)
//     }
//   }, [globe])

//   // ── Sublayer rendering (headless bridge components) ───────────────────────
//   return (
//     <>
//       <FloodOverlay
//         scene={scene}
//         maskTexture={maskTexture}
//         registerAnimated={registerAnimated}
//       />
//       <Clouds
//         scene={scene}
//         lightningRef={lightningRef}
//         registerAnimated={registerAnimated}
//       />
//       <FloodRipples
//         scene={scene}
//         registerAnimated={registerAnimated}
//       />
//       <RainParticles
//         scene={scene}
//         registerAnimated={registerAnimated}
//       />
//       <Lightning
//         scene={scene}
//         lightningRef={lightningRef}
//         registerAnimated={registerAnimated}
//       />
//     </>
//   )
// }





/**
 * FloodLayer/index.jsx — Flood Risk animation coordinator.
 * 
 * Enhanced: Dynamic camera orbit around flood zone.
 */
import { useEffect, useRef, useCallback } from 'react'
import Clouds        from './Clouds'
import RainParticles from './RainParticles'
import FloodRipples  from './FloodRipples'
import FloodOverlay  from './FloodOverlay'
import Lightning     from './Lightning'

export default function FloodLayer({ globe, scene, maskTexture }) {
  const lightningRef  = useRef({ value: 0.0 })
  const animatedRef   = useRef([])

  const registerAnimated = useCallback((updateFn) => {
    animatedRef.current.push(updateFn)
    return () => {
      animatedRef.current = animatedRef.current.filter(fn => fn !== updateFn)
    }
  }, [])

  // ── Shared RAF loop ──────────────────────────────────────────────────────
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

  // ── Camera: zoom in + dynamic orbit ─────────────────────────────────────
  useEffect(() => {
    if (!globe) return

    const centerLat = 23.7
    const centerLng = 90.4
    let startTime = Date.now()
    let orbitInterval

    const animateOrbit = () => {
      const elapsed = (Date.now() - startTime) / 1000
      const angle = elapsed * 0.03
      const lat = centerLat + Math.sin(angle) * 0.5
      const lng = centerLng + Math.cos(angle) * 0.5
      globe.pointOfView({ lat, lng, altitude: 1.85 }, 2000)
    }

    // Initial zoom
    globe.pointOfView({ lat: centerLat, lng: centerLng, altitude: 1.85 }, 1500)

    // Start orbit after zoom completes
    const zoomTimer = setTimeout(() => {
      orbitInterval = setInterval(animateOrbit, 2000)
    }, 1500)

    return () => {
      clearTimeout(zoomTimer)
      if (orbitInterval) clearInterval(orbitInterval)
      // Restore camera
      globe.pointOfView({ lat: 20, lng: 70, altitude: 2.2 }, 800)
    }
  }, [globe])

  // ── Sublayers ────────────────────────────────────────────────────────────
  return (
    <>
      <FloodOverlay
        scene={scene}
        maskTexture={maskTexture}
        registerAnimated={registerAnimated}
      />
      <Clouds
        scene={scene}
        lightningRef={lightningRef}
        registerAnimated={registerAnimated}
      />
      <FloodRipples
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <RainParticles
        scene={scene}
        registerAnimated={registerAnimated}
      />
      <Lightning
        scene={scene}
        lightningRef={lightningRef}
        registerAnimated={registerAnimated}
      />
    </>
  )
}