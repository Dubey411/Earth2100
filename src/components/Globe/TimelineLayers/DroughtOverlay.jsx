/**
 * TimelineLayers/DroughtOverlay.jsx
 *
 * Renders expanding warm-brown drought halos over major arid risk zones.
 * Radius and opacity scale with snapshot.droughtScale (1.0 → 2.5).
 *
 * Each halo has:
 *  - A base opacity driven by droughtScale
 *  - A per-patch shimmer: sin(t + phaseOffset)
 *  - Scale grows from base radius × 1.0 (2025) → × 2.5 (2100 crisis)
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GLOBE_R = 100

// Major drought / desertification zones
const DROUGHT_ZONES = [
  // Sahel / Sub-Saharan
  { lat: 14.0,  lng: 10.0,   baseR: 7.5, phase: 0.0  },
  { lat: 12.0,  lng: 35.0,   baseR: 6.0, phase: 1.1  },
  // Middle East / Arabian Peninsula
  { lat: 24.0,  lng: 45.0,   baseR: 7.0, phase: 0.7  },
  { lat: 33.0,  lng: 55.0,   baseR: 5.5, phase: 2.0  },
  // Central Asia
  { lat: 42.0,  lng: 62.0,   baseR: 6.5, phase: 1.5  },
  // SW USA / Mexico
  { lat: 36.0,  lng: -115.0, baseR: 5.5, phase: 0.3  },
  { lat: 32.0,  lng: -108.0, baseR: 5.0, phase: 1.8  },
  // Australia (interior)
  { lat: -25.0, lng: 133.0,  baseR: 8.0, phase: 0.9  },
  { lat: -30.0, lng: 120.0,  baseR: 6.0, phase: 2.3  },
  // Northern China / Mongolia
  { lat: 44.0,  lng: 108.0,  baseR: 6.0, phase: 0.5  },
  // Southern Africa
  { lat: -24.0, lng: 24.0,   baseR: 6.5, phase: 1.3  },
  // Patagonia
  { lat: -48.0, lng: -68.0,  baseR: 5.0, phase: 1.6  },
]

function latLngToXYZ(lat, lng, R) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return {
    x: -R * Math.sin(phi) * Math.cos(theta),
    y:  R * Math.cos(phi),
    z:  R * Math.sin(phi) * Math.sin(theta),
  }
}

function degToGlobeRadius(deg, R) {
  return (deg / 360) * 2 * Math.PI * R * 0.42
}

export default function DroughtOverlay({ scene, snapshot }) {
  const meshesRef  = useRef([])
  const rafRef     = useRef(null)
  const startRef   = useRef(performance.now())
  const currentRef = useRef(1.0)   // droughtScale lerp target (baseline = 1.0)

  useEffect(() => {
    if (!scene) return

    const meshes = []

    DROUGHT_ZONES.forEach(({ lat, lng, baseR, phase }) => {
      const center     = latLngToXYZ(lat, lng, GLOBE_R + 0.45)
      const baseRadius = degToGlobeRadius(baseR, GLOBE_R)

      const geo = new THREE.CircleGeometry(baseRadius, 32)
      const mat = new THREE.MeshBasicMaterial({
        color:       0xb85a10,     // warm burnt-orange brown
        transparent: true,
        opacity:     0,
        side:        THREE.DoubleSide,
        depthWrite:  false,
      })

      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(center.x, center.y, center.z)
      mesh.lookAt(0, 0, 0)
      mesh.rotateX(Math.PI)

      mesh.renderOrder       = 5
      mesh.userData.phase    = phase
      mesh.userData.baseRadius = baseRadius
      mesh.scale.set(1, 1, 1)

      scene.add(mesh)
      meshes.push(mesh)
    })

    meshesRef.current = meshes

    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000

      // Lerp droughtScale
      const target = snapshot?.active ? (snapshot.droughtScale ?? 1.0) : 1.0
      const cur    = currentRef.current
      const next   = cur + (target - cur) * 0.025
      currentRef.current = next

      // Normalise scale to 0..1 for opacity (1.0 = no drought, 2.5 = max)
      const normalised = Math.max(0, (next - 1.0) / 1.5)

      meshes.forEach((m) => {
        const shimmer  = 0.55 + 0.45 * Math.sin(t * 0.9 + m.userData.phase)
        m.material.opacity = normalised * shimmer * 0.75

        // Scale the patch proportionally to droughtScale
        const s = 0.8 + normalised * 0.7
        m.scale.set(s, s, 1)
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      meshes.forEach((m) => {
        scene.remove(m)
        m.geometry.dispose()
        m.material.dispose()
      })
      meshesRef.current = []
    }
  }, [scene])  // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
