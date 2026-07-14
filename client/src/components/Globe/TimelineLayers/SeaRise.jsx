/**
 * TimelineLayers/SeaRise.jsx
 *
 * Visualises projected sea level rise as a semi-transparent cyan ocean shell
 * that brightens and expands coastal glow as snapshot.seaLevel increases (0→1).
 *
 * Approach:
 *  - A MeshBasicMaterial sphere slightly above globe radius
 *  - A custom vertex shader masks it to ocean + coastal zones only using the
 *    land mask texture passed in from EarthGlobe
 *  - Opacity scales with seaLevel
 *  - An animated breathing pulse gives it life
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GLOBE_R   = 100
const SEA_R     = GLOBE_R + 0.35   // just above surface

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  uniform sampler2D uLandMask;
  uniform float     uSeaLevel;   // 0..1
  uniform float     uTime;
  varying vec2      vUv;

  void main() {
    float land = texture2D(uLandMask, vUv).r;  // 1=land, 0=ocean

    // Only render over ocean pixels (and coastal fringe)
    float coastal = smoothstep(0.3, 0.7, land); // 0 = pure ocean, 1 = deep land
    float ocean   = 1.0 - coastal;

    // Coastal glow: land pixels near coast get extra tinge
    float coastalGlow = land * (1.0 - land) * 4.0 * uSeaLevel;

    float pulse = 0.85 + 0.15 * sin(uTime * 1.8);
    float alpha = (ocean * 0.55 + coastalGlow * 0.9) * uSeaLevel * pulse;

    // Color: deep blue → cyan as seaLevel rises
    vec3 deepBlue = vec3(0.0, 0.25, 0.55);
    vec3 cyanGlow = vec3(0.0, 0.88, 0.95);
    vec3 col = mix(deepBlue, cyanGlow, uSeaLevel);

    gl_FragColor = vec4(col, alpha);
  }
`

export default function SeaRise({ scene, snapshot, landMask }) {
  const meshRef    = useRef(null)
  const rafRef     = useRef(null)
  const startRef   = useRef(performance.now())
  const currentRef = useRef(0)

  useEffect(() => {
    if (!scene) return

    const geo = new THREE.SphereGeometry(SEA_R, 128, 64)
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uLandMask: { value: landMask ?? null },
        uSeaLevel: { value: 0.0 },
        uTime:     { value: 0.0 },
      },
      transparent: true,
      depthWrite:  false,
      side:        THREE.FrontSide,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 4
    scene.add(mesh)
    meshRef.current = mesh

    // RAF loop for time uniform + lerp
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000
      if (meshRef.current) {
        meshRef.current.material.uniforms.uTime.value = elapsed

        // Lerp seaLevel toward target
        const target = snapshot?.active ? (snapshot.seaLevel ?? 0) : 0
        const cur    = currentRef.current
        const next   = cur + (target - cur) * 0.03
        currentRef.current = next
        meshRef.current.material.uniforms.uSeaLevel.value = next
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      scene.remove(mesh)
      geo.dispose()
      mat.dispose()
    }
  }, [scene, landMask])  // eslint-disable-line react-hooks/exhaustive-deps

  // Reactively update target (the RAF loop reads from snapshot ref)
  useEffect(() => {
    // snapshot changes are picked up by the RAF loop via closure
  }, [snapshot?.seaLevel, snapshot?.active])

  return null
}
