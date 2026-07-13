/**
 * TimelineLayers/IceCaps.jsx
 *
 * Renders shrinking polar ice caps using two GPU sphere segments.
 * - North cap: lat 60°–90°N  → upper hemisphere slice
 * - South cap: lat 60°–90°S  → lower hemisphere slice
 *
 * snapshot.iceAlpha: 1.0 = full ice (2025), 0.0 = nearly gone (2100 crisis)
 * Smooth lerp is done inside the RAF tick to avoid React re-renders on every frame.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Globe radius (matches react-globe.gl default)
const GLOBE_R = 100

// How far above the surface to sit (avoids z-fighting)
const OFFSET = 0.6

// Polar cap geometry: a sphere with phiStart/phiLength masking to a latitude band.
// THREE.SphereGeometry phi angles: 0=north pole, PI=south pole.
// Lat 60° = phi = PI/6 from pole = PI*(30/180) = PI/6
// phi at equator = PI/2
// So north cap: phiStart=0, phiLength=PI/6
// South cap:    phiStart=PI-PI/6=5PI/6, phiLength=PI/6

function createCapMesh(isNorth) {
  const r           = GLOBE_R + OFFSET
  const phiStart    = isNorth ? 0 : (Math.PI * 5) / 6
  const phiLength   = Math.PI / 6
  const geo = new THREE.SphereGeometry(r, 64, 32, 0, Math.PI * 2, phiStart, phiLength)

  const mat = new THREE.MeshBasicMaterial({
    color:       0xd0f8ff,
    transparent: true,
    opacity:     1.0,
    side:        THREE.FrontSide,
    depthWrite:  false,
  })

  return new THREE.Mesh(geo, mat)
}

export default function IceCaps({ scene, snapshot }) {
  const northRef   = useRef(null)
  const southRef   = useRef(null)
  const currentRef = useRef(1.0)   // currently displayed alpha (for lerp)
  const rafRef     = useRef(null)

  // ── Mount caps once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scene) return

    const north = createCapMesh(true)
    const south = createCapMesh(false)
    north.renderOrder = 3
    south.renderOrder = 3

    scene.add(north)
    scene.add(south)
    northRef.current = north
    southRef.current = south

    return () => {
      scene.remove(north)
      scene.remove(south)
      north.geometry.dispose()
      south.geometry.dispose()
      north.material.dispose()
      south.material.dispose()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scene])

  // ── Animate alpha toward snapshot.iceAlpha ─────────────────────────────────
  useEffect(() => {
    if (!northRef.current || !southRef.current) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const targetAlpha = snapshot?.active ? (snapshot.iceAlpha ?? 1.0) : 1.0

    const tick = () => {
      const cur     = currentRef.current
      const diff    = targetAlpha - cur
      const next    = Math.abs(diff) < 0.001 ? targetAlpha : cur + diff * 0.04

      currentRef.current = next

      if (northRef.current) northRef.current.material.opacity = next * 0.92
      if (southRef.current) southRef.current.material.opacity = next * 0.92

      // Also tint: full ice = cold white, melting = warmer cyan hint
      const hue = next > 0.5 ? 0xd0f8ff : 0x88ddff
      if (northRef.current) northRef.current.material.color.setHex(hue)
      if (southRef.current) southRef.current.material.color.setHex(hue)

      if (Math.abs(targetAlpha - next) > 0.001) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [snapshot?.iceAlpha, snapshot?.active])

  return null  // pure Three.js — no DOM output
}
