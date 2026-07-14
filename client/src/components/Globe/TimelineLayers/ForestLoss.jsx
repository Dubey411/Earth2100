/**
 * TimelineLayers/ForestLoss.jsx
 *
 * Renders pulsing dark-red deforestation patches over major forest regions.
 * Opacity driven by snapshot.forestLoss (0 = invisible, 1 = fully visible).
 *
 * Uses instanced CircleGeometry for GPU efficiency.
 * Each patch has a random phase offset for an organic look.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GLOBE_R = 100

// Major deforestation zones: [lat, lng, radiusDeg, label]
const FOREST_ZONES = [
  // Amazon Basin — multiple overlapping patches
  { lat: -3.5,  lng: -62.0, r: 8.0,  phase: 0.0  },
  { lat: -6.0,  lng: -55.0, r: 6.5,  phase: 0.8  },
  { lat: -1.0,  lng: -68.0, r: 5.5,  phase: 1.4  },
  { lat: -9.0,  lng: -63.0, r: 7.0,  phase: 2.1  },
  // Congo Basin
  { lat: -0.5,  lng: 23.5,  r: 7.0,  phase: 0.5  },
  { lat: -2.5,  lng: 18.0,  r: 5.5,  phase: 1.7  },
  // Borneo / Indonesia
  { lat:  0.5,  lng: 114.0, r: 5.5,  phase: 0.3  },
  { lat: -2.0,  lng: 117.5, r: 4.5,  phase: 1.1  },
  // Southeast Asia
  { lat: 16.0,  lng: 101.0, r: 4.0,  phase: 2.5  },
  // Boreal Russia
  { lat: 60.0,  lng: 90.0,  r: 8.0,  phase: 0.7  },
  { lat: 58.0,  lng: 60.0,  r: 6.0,  phase: 1.9  },
  // Canada Boreal
  { lat: 55.0,  lng: -110.0,r: 7.0,  phase: 0.4  },
]

/**
 * Convert lat/lng to a 3-D point on the sphere surface.
 * Returns { x, y, z } at radius R.
 */
function latLngToXYZ(lat, lng, R) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return {
    x: -R * Math.sin(phi) * Math.cos(theta),
    y:  R * Math.cos(phi),
    z:  R * Math.sin(phi) * Math.sin(theta),
  }
}

/**
 * Approximate the radius of a circle on the globe surface
 * from a degree radius.  1° ≈ (2π R / 360) units.
 */
function degToGlobeRadius(deg, R) {
  return (deg / 360) * 2 * Math.PI * R * 0.45
}

export default function ForestLoss({ scene, snapshot }) {
  const meshesRef  = useRef([])
  const rafRef     = useRef(null)
  const startRef   = useRef(performance.now())
  const currentRef = useRef(0)

  useEffect(() => {
    if (!scene) return

    const meshes = []

    FOREST_ZONES.forEach(({ lat, lng, r, phase }) => {
      const center  = latLngToXYZ(lat, lng, GLOBE_R + 0.5)
      const radius  = degToGlobeRadius(r, GLOBE_R)

      const geo = new THREE.CircleGeometry(radius, 32)
      const mat = new THREE.MeshBasicMaterial({
        color:       0xcc1111,
        transparent: true,
        opacity:     0,
        side:        THREE.DoubleSide,
        depthWrite:  false,
      })

      const mesh = new THREE.Mesh(geo, mat)

      // Place the circle tangent to the globe surface, oriented outward
      mesh.position.set(center.x, center.y, center.z)
      mesh.lookAt(0, 0, 0)
      mesh.rotateX(Math.PI)   // flip to face outward

      mesh.renderOrder = 6
      mesh.userData.phase = phase
      scene.add(mesh)
      meshes.push(mesh)
    })

    meshesRef.current = meshes

    const tick = () => {
      const t      = (performance.now() - startRef.current) / 1000
      const target = snapshot?.active ? (snapshot.forestLoss ?? 0) : 0
      const cur    = currentRef.current
      const next   = cur + (target - cur) * 0.025
      currentRef.current = next

      meshes.forEach((m) => {
        const pulse  = 0.6 + 0.4 * Math.sin(t * 1.2 + m.userData.phase)
        m.material.opacity = next * pulse * 0.85
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
