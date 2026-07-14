/**
 * TimelineLayers/IceMeltingDetails.jsx
 *
 * Renders dynamic, floating icebergs breaking off from the Antarctic ice sheet
 * and Greenland glaciers, drifting into the ocean, spinning, and melting.
 *
 * Intensity is proportional to the timeline's temperature rise and ice loss:
 * - More icebergs spawn as snapshot.iceAlpha decreases (melting increases).
 * - They drift further and melt faster under high temp scenarios.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GLOBE_R = 100
const SURFACE_OFFSET = 0.8
const MAX_ICEBERGS = 60

// Convert lat/lng to 3D Cartesian coordinates
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  )
}

export default function IceMeltingDetails({ scene, snapshot }) {
  const containerRef = useRef(null)
  const icebergsRef = useRef([])
  const rafRef = useRef(null)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    if (!scene) return

    // Create a container group for all icebergs
    const group = new THREE.Group()
    scene.add(group)
    containerRef.current = group

    // Pre-create iceberg meshes
    const icebergs = []
    const geometry = new THREE.DodecahedronGeometry(1.2, 0) // low-poly iceberg shape
    const material = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.25,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    })

    for (let i = 0; i < MAX_ICEBERGS; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone())
      mesh.visible = false
      mesh.renderOrder = 7
      group.add(mesh)

      icebergs.push({
        mesh,
        active: false,
        lat: 0,
        lng: 0,
        startLat: 0,
        startLng: 0,
        driftLatSpeed: 0,
        driftLngSpeed: 0,
        rotationSpeed: 0,
        rotAxis: new THREE.Vector3(),
        scale: 1,
        maxLife: 1,
        life: 0,
        isAntarctic: true,
      })
    }

    icebergsRef.current = icebergs

    // Spawn / update loop
    const tick = () => {
      const now = performance.now()
      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      // Derive active state & configuration from snapshot
      const active = snapshot?.active ?? false
      const iceAlpha = snapshot?.iceAlpha ?? 1.0
      const tempC = snapshot?.tempC ?? 1.1

      // Melting rate is high when iceAlpha is declining (between 0.05 and 0.95)
      const meltingActivity = active ? clamp((1.0 - iceAlpha) * 1.5, 0, 1.0) : 0

      // Number of icebergs depends on melting activity
      const targetActiveCount = Math.round(meltingActivity * MAX_ICEBERGS)

      let activeCount = 0
      icebergs.forEach((ib) => {
        if (ib.active) activeCount++
      })

      // Spawn new icebergs if under target count
      if (activeCount < targetActiveCount) {
        const inactiveIb = icebergs.find((ib) => !ib.active)
        if (inactiveIb) {
          // 80% Antarctica (South Pole), 20% Greenland (North Pole)
          const isAntarctic = Math.random() < 0.8
          let spawnLat, spawnLng

          if (isAntarctic) {
            // Spawn around Antarctic coastline (approx -70° to -75° latitude)
            spawnLat = -70 - Math.random() * 5
            spawnLng = Math.random() * 360 - 180
          } else {
            // Spawn around Greenland (approx 65° to 75° latitude, -30° to -60° longitude)
            spawnLat = 65 + Math.random() * 10
            spawnLng = -30 - Math.random() * 30
          }

          inactiveIb.active = true
          inactiveIb.isAntarctic = isAntarctic
          inactiveIb.lat = spawnLat
          inactiveIb.lng = spawnLng
          inactiveIb.startLat = spawnLat
          inactiveIb.startLng = spawnLng

          // Drift away from poles: Antarctic drifts north (positive delta), Arctic drifts south (negative delta)
          const driftDir = isAntarctic ? 1.0 : -1.0
          inactiveIb.driftLatSpeed = (0.8 + Math.random() * 1.5) * driftDir * (tempC * 0.5)
          inactiveIb.driftLngSpeed = (Math.random() - 0.5) * 2.0 // slow longitude drift

          inactiveIb.rotationSpeed = 0.2 + Math.random() * 0.5
          inactiveIb.rotAxis.set(Math.random(), Math.random(), Math.random()).normalize()
          inactiveIb.life = 0
          inactiveIb.maxLife = 6.0 + Math.random() * 8.0 // life in seconds
          inactiveIb.scale = 0.5 + Math.random() * 0.8

          inactiveIb.mesh.visible = true
          inactiveIb.mesh.scale.setScalar(inactiveIb.scale)
        }
      }

      // Update active icebergs
      icebergs.forEach((ib) => {
        if (!ib.active) return

        ib.life += dt
        const ageFrac = ib.life / ib.maxLife

        if (ageFrac >= 1.0) {
          // Melted completely! Reset.
          ib.active = false
          ib.mesh.visible = false
          return
        }

        // Apply drift
        ib.lat += ib.driftLatSpeed * dt
        ib.lng += ib.driftLngSpeed * dt

        // Place on globe surface
        const pos = latLngToVector3(ib.lat, ib.lng, GLOBE_R + SURFACE_OFFSET)
        ib.mesh.position.copy(pos)

        // Make the iceberg mesh align tangent to surface
        const normal = pos.clone().normalize()
        const arbitrary = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
        const tangent = normal.clone().cross(arbitrary).normalize()
        const bitangent = normal.clone().cross(tangent).normalize()
        ib.mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(tangent, bitangent, normal))

        // Apply local spin rotation
        ib.mesh.rotateOnAxis(ib.rotAxis, ib.rotationSpeed * dt)

        // Shrink (melt) and fade out as life expires
        const currentScale = ib.scale * (1.0 - ageFrac)
        ib.mesh.scale.setScalar(currentScale)

        // Emissive glow intensifies slightly as it melts
        ib.mesh.material.opacity = (1.0 - ageFrac) * 0.85
        ib.mesh.material.emissiveIntensity = 0.25 + ageFrac * 0.40
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      scene.remove(group)
      geometry.dispose()
      icebergs.forEach((ib) => {
        ib.mesh.material.dispose()
      })
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  // Helper utility to clamp values
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val))
  }

  return null
}
