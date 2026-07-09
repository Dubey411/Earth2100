/**
 * FloodBeams.jsx — Glowing vertical light columns rising from each flood hotspot.
 *
 * Uses direct 3D world-space positioning (no UV shader alignment issues).
 * Each beam is a CylinderGeometry centred at the hotspot, oriented radially
 * outward from the Earth's centre. The beam pulses in height and opacity.
 *
 * Why this DEFINITELY renders in the right place:
 *   latLngToWorld() converts hotspot coordinates to the same Three.js world
 *   space used by react-globe.gl (accounts for the -PI/2 Y rotation).
 *
 * 5 beams, one per hotspot. Each has a slightly different phase.
 * Height: 0 → 12 units above surface over 4 seconds, then breathes.
 * Colour: Electric cyan (#00E5FF) with additive glow.
 *
 * Fade : 800ms in, 500ms out
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { FLOOD_HOTSPOTS } from './constants'

const GLOBE_R     = 100.0
const BEAM_RADIUS = 1.8      // cylinder radius in Three.js units
const BEAM_MAX_H  = 14.0    // max height above globe surface
const FADE_IN_MS  = 800
const FADE_OUT_MS = 500

// ── Convert lat/lng to world position (in react-globe.gl scene space) ─────────
// react-globe.gl renders the globe with rotation.y = -Math.PI/2.
// So the world X/Z mapping for lat/lng is:
//   phi    = (90 - lat) * PI/180   (polar angle from +Y)
//   theta  = lng * PI/180          (azimuthal in local space before rotation)
// After Y rotation: worldX = -local_z, worldY = local_y, worldZ = local_x
function latLngToWorld(lat, lng, r) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = lng * Math.PI / 180
  const lx    = r * Math.sin(phi) * Math.cos(theta)
  const ly    = r * Math.cos(phi)
  const lz    = r * Math.sin(phi) * Math.sin(theta)
  // Apply Y rotation -PI/2:
  return new THREE.Vector3(-lz, ly, lx)
}

// ── Beam material (additive glow cylinder) ────────────────────────────────────
const BEAM_VERT = /* glsl */`
  varying float vY;    // 0 at base, 1 at tip
  void main() {
    vY = (position.y + 0.5);   // CylinderGeometry centers at 0; map to [0,1]
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BEAM_FRAG = /* glsl */`
  precision mediump float;
  uniform float uOpacity;
  uniform float uPhase;   // [0,1] animation phase, unique per beam
  varying float vY;

  void main() {
    // Fade from base (vY=0) to tip (vY=1)
    float fadeUp = 1.0 - vY;
    // Soft inner glow
    float glow = fadeUp * fadeUp * uOpacity;
    if (glow < 0.01) discard;
    // Electric cyan
    gl_FragColor = vec4(0.05, 0.85, 1.00, glow * 0.70);
  }
`

export default function FloodBeams({ scene, realtimeData, registerAnimated }) {
  useEffect(() => {
    const beams = FLOOD_HOTSPOTS.map(([lat, lng], idx) => {
      const surfacePos = latLngToWorld(lat, lng, GLOBE_R + 0.3)
      const radialDir  = surfacePos.clone().normalize()    // outward direction

      // CylinderGeometry: height, radiusTop, radiusBottom, segments
      const geo  = new THREE.CylinderGeometry(0, BEAM_RADIUS, BEAM_MAX_H, 8, 1, true)
      const mat  = new THREE.ShaderMaterial({
        vertexShader:   BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        uniforms: {
          uOpacity: { value: 0.0 },
          uPhase:   { value: idx / FLOOD_HOTSPOTS.length },
        },
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        side:        THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geo, mat)

      // ── Position: surface + half beam height along radial direction ────────
      // CylinderGeometry default axis is +Y; align it to radialDir
      const up      = new THREE.Vector3(0, 1, 0)
      const quat    = new THREE.Quaternion().setFromUnitVectors(up, radialDir)
      mesh.quaternion.copy(quat)

      // Centre the beam base ON the surface: offset by half height
      mesh.position.copy(surfacePos).addScaledVector(radialDir, BEAM_MAX_H * 0.5)

      mesh.frustumCulled = false
      mesh.renderOrder   = 9

      // Set identification metadata for click handler
      mesh.userData = {
        floodType: 'beam',
        name: '3D Precipitation Beacon',
        index: idx
      }

      scene.add(mesh)

      return { mesh, mat, phase: idx * 0.37 }   // stagger phases
    })

    const startMs = performance.now()

    const unregister = registerAnimated((t) => {
      const elapsed = performance.now() - startMs
      const globalFade = Math.min(elapsed / FADE_IN_MS, 1.0)

      beams.forEach(({ mesh, mat, phase }, idx) => {
        // Read live precipitation from Open-Meteo if available
        let rainVal = 0.0
        if (realtimeData && realtimeData[idx]) {
          rainVal = realtimeData[idx].precipitation
        }
        
        // Dynamically scale Y height based on live precipitation amount (0.0 to 10.0 mm)
        // Dormant height is 0.25, fully active rain height is 1.50
        const targetScaleY = 0.25 + 1.25 * Math.min(rainVal / 10.0, 1.0)

        // Pulse animation
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.9 + phase * Math.PI * 2))
        mat.uniforms.uOpacity.value = pulse * globalFade

        // Smoothly interpolate the scale towards the target scale (lerp)
        mesh.scale.set(1.0, THREE.MathUtils.lerp(mesh.scale.y, targetScaleY, 0.05), 1.0)
      })
    })

    return () => {
      unregister()
      const fadeStart  = performance.now()
      const fadeOut = () => {
        const p = (performance.now() - fadeStart) / FADE_OUT_MS
        if (p < 1.0) {
          beams.forEach(({ mat }) => { mat.uniforms.uOpacity.value = 1.0 - p })
          requestAnimationFrame(fadeOut)
        } else {
          beams.forEach(({ mesh, mat }) => {
            scene.remove(mesh)
            mesh.geometry.dispose()
            mat.dispose()
          })
        }
      }
      requestAnimationFrame(fadeOut)
    }
  }, [scene, realtimeData]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
