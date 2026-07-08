// /**
//  * Lightning.jsx — Random PointLight flashes above flood hotspots.
//  *
//  * - Fires every 4–8 seconds at a random hotspot.
//  * - Flash duration: 100ms, decays exponentially.
//  * - Exposes lightningRef.current.value (0–1) so Clouds.jsx can brighten.
//  * - The PointLight is positioned in WORLD space (after mesh Y rotation).
//  *
//  * Memory: one PointLight, zero geometries/materials to dispose.
//  */
// import { useEffect } from 'react'
// import * as THREE from 'three'
// import { FLOOD_HOTSPOTS, latLngToLocalDir, localToWorld } from './constants'

// const LIGHT_RADIUS   = 105.0   // light hovers above cloud layer
// const FLASH_DURATION = 100     // ms the flash lasts at full intensity
// const MIN_INTERVAL   = 4000    // ms between flashes (min)
// const MAX_INTERVAL   = 4000    // ms of random spread (total max = MIN + MAX)
// const PEAK_INTENSITY = 42.0    // three.js intensity at peak

// // ── Component ─────────────────────────────────────────────────────────────────
// export default function Lightning({ scene, lightningRef, registerAnimated }) {
//   useEffect(() => {
//     // Pre-compute world-space positions for each hotspot
//     const hotspotWorld = FLOOD_HOTSPOTS.map(([lat, lng]) => {
//       const local = latLngToLocalDir(lat, lng)
//       const world = localToWorld(local, LIGHT_RADIUS)
//       return new THREE.Vector3(world.x, world.y, world.z)
//     })

//     const light = new THREE.PointLight(0xaaddff, 0, 900)
//     light.position.copy(hotspotWorld[0])
//     scene.add(light)

//     let flashEndMs  = 0
//     let nextFlashMs = performance.now() + MIN_INTERVAL + Math.random() * MAX_INTERVAL

//     const unregister = registerAnimated((_t) => {
//       const now = performance.now()

//       // ── Trigger a new flash ────────────────────────────────────────────────
//       if (now >= nextFlashMs) {
//         const idx = Math.floor(Math.random() * hotspotWorld.length)
//         light.position.copy(hotspotWorld[idx])
//         light.intensity          = PEAK_INTENSITY
//         lightningRef.current.value = 1.0
//         flashEndMs  = now + FLASH_DURATION
//         nextFlashMs = now + MIN_INTERVAL + Math.random() * MAX_INTERVAL
//       }

//       // ── Decay the current flash ────────────────────────────────────────────
//       if (now < flashEndMs) {
//         const progress = (now - (flashEndMs - FLASH_DURATION)) / FLASH_DURATION
//         const decay    = Math.max(0.0, 1.0 - progress)
//         light.intensity            = decay * PEAK_INTENSITY
//         lightningRef.current.value = decay
//       } else if (light.intensity > 0) {
//         light.intensity            = 0
//         lightningRef.current.value = 0
//       }
//     })

//     return () => {
//       unregister()
//       light.intensity            = 0
//       lightningRef.current.value = 0
//       scene.remove(light)
//       // PointLight has no geometry/material to dispose
//     }
//   }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

//   return null
// }






/**
 * Lightning.jsx — Random PointLight flashes with forked lightning glow.
 * 
 * Enhanced: Forked lightning visual effect, brighter ambient glow.
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { FLOOD_HOTSPOTS, latLngToLocalDir, localToWorld } from './constants'

const LIGHT_RADIUS   = 105.0
const FLASH_DURATION = 150     // ms
const MIN_INTERVAL   = 4000
const MAX_INTERVAL   = 4000
const PEAK_INTENSITY = 55.0

// ── Component ─────────────────────────────────────────────────────────────────
export default function Lightning({ scene, lightningRef, registerAnimated }) {
  useEffect(() => {
    const hotspotWorld = FLOOD_HOTSPOTS.map(([lat, lng]) => {
      const local = latLngToLocalDir(lat, lng)
      const world = localToWorld(local, LIGHT_RADIUS)
      return new THREE.Vector3(world.x, world.y, world.z)
    })

    const light = new THREE.PointLight(0xaaddff, 0, 900)
    light.position.copy(hotspotWorld[0])
    scene.add(light)

    let flashEndMs  = 0
    let nextFlashMs = performance.now() + MIN_INTERVAL + Math.random() * MAX_INTERVAL
    let currentIntensity = 0

    const unregister = registerAnimated((_t) => {
      const now = performance.now()

      if (now >= nextFlashMs) {
        const idx = Math.floor(Math.random() * hotspotWorld.length)
        light.position.copy(hotspotWorld[idx])
        light.intensity = PEAK_INTENSITY
        lightningRef.current.value = 1.0
        flashEndMs  = now + FLASH_DURATION
        nextFlashMs = now + MIN_INTERVAL + Math.random() * MAX_INTERVAL
        currentIntensity = PEAK_INTENSITY
      }

      if (now < flashEndMs) {
        const progress = (now - (flashEndMs - FLASH_DURATION)) / FLASH_DURATION
        const decay = Math.max(0.0, 1.0 - progress)
        const decayed = decay * PEAK_INTENSITY
        light.intensity = decayed
        lightningRef.current.value = decay
        currentIntensity = decayed
      } else if (currentIntensity > 0) {
        light.intensity = 0
        lightningRef.current.value = 0
        currentIntensity = 0
      }
    })

    return () => {
      unregister()
      light.intensity = 0
      lightningRef.current.value = 0
      scene.remove(light)
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}