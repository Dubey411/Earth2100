



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
export default function Lightning({ globe, scene, lightningRef, registerAnimated }) {
  useEffect(() => {
    if (!globe) return

    const hotspotWorld = FLOOD_HOTSPOTS.map(([lat, lng]) => {
      // relAltitude = 0.05 corresponds to radius 105.0
      const coords = globe.getCoords(lat, lng, 0.05)
      return new THREE.Vector3(coords.x, coords.y, coords.z)
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