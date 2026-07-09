/**
 * OceanCurrents.jsx — Volumetric Equatorial Pacific currents particle system.
 *
 * Runs a GPU-based particle simulation where 800 particles flow in the Pacific.
 * Confined strictly to lat [-7, 7] and lng [120E, 80W] (represented as [120, 280] degrees).
 *
 * Flows:
 *   - Normal state: Westward (East to West)
 *   - El Niño state: Eastward (West to East)
 *
 * Radius: 100.18 (flows on the ocean surface)
 * Blending: Additive blending for a soft cyan glow.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const CURRENTS_RADIUS = 100.18
const PARTICLE_COUNT  = 800
const FADE_IN_MS      = 1000
const FADE_OUT_MS     = 600

const VERT = /* glsl */`
  attribute float aLat;
  attribute float aStartLng; // [120, 280]
  attribute float aBirthPhase;
  attribute float aSpeed;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uFlowDirection; // -1.0 = Westward (Normal), +1.0 = Eastward (El Nino)

  varying float vAlpha;

  void main() {
    // Flow speed: 4.5 degrees per second
    float flowSpeed = aSpeed * uFlowDirection * 5.2;
    float lngRange  = 160.0; // 120E to 80W (280E)

    // Staggered wrap-around longitude math
    float rawLng = aStartLng + uTime * flowSpeed + aBirthPhase * lngRange;
    float lng = mod(rawLng - 120.0, lngRange) + 120.0;

    // Convert geographic coordinates to 3D Cartesian coordinates
    float phi   = (90.0 - aLat) * 3.14159265 / 180.0;
    float theta = (90.0 - lng) * 3.14159265 / 180.0;

    vec3 pos = vec3(
      ${CURRENTS_RADIUS.toFixed(2)} * sin(phi) * cos(theta),
      ${CURRENTS_RADIUS.toFixed(2)} * cos(phi),
      ${CURRENTS_RADIUS.toFixed(2)} * sin(phi) * sin(theta)
    );

    // Apply prime-meridian rotation to align with EarthGlobe mesh.rotation.y = -PI/2
    // worldX = -local_z, worldZ = local_x
    vec3 rotatedPos = vec3(-pos.z, pos.y, pos.x);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(rotatedPos, 1.0);

    // Fade out near the boundaries of the Pacific basin
    float normLng = (lng - 120.0) / lngRange;
    float lngFade = smoothstep(0.0, 0.10, normLng) * smoothstep(1.0, 0.90, normLng);

    // Fade out particles near the edges of the equatorial belt
    float latFade = smoothstep(7.0, 0.0, abs(aLat));

    gl_PointSize = mix(2.5, 4.2, fract(aBirthPhase * 3.0));
    vAlpha = lngFade * latFade * uOpacity * 0.75;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;

  void main() {
    // Circular particle shape with soft edge glow
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    if (dist > 0.5) discard;

    float glow = smoothstep(0.5, 0.15, dist);
    // Soft cyan glowing current color
    vec3 color = vec3(0.0, 0.92, 1.0);

    gl_FragColor = vec4(color, glow * vAlpha);
  }
`

export default function OceanCurrents({ scene, registerAnimated }) {
  useEffect(() => {
    const lats        = new Float32Array(PARTICLE_COUNT)
    const startLngs   = new Float32Array(PARTICLE_COUNT)
    const birthPhases = new Float32Array(PARTICLE_COUNT)
    const speeds      = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Confine to Equatorial Pacific lat [-6, 6]
      lats[i]        = (Math.random() - 0.5) * 12.0
      // 120E to 80W (280E)
      startLngs[i]   = 120.0 + Math.random() * 160.0
      birthPhases[i] = Math.random()
      speeds[i]      = 0.75 + Math.random() * 0.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)) // dummy placeholder
    geo.setAttribute('aLat',        new THREE.BufferAttribute(lats, 1))
    geo.setAttribute('aStartLng',   new THREE.BufferAttribute(startLngs, 1))
    geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(birthPhases, 1))
    geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:          { value: 0.0 },
        uOpacity:       { value: 0.0 },
        uFlowDirection: { value: -1.0 }, // Westward initially
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, material)
    points.frustumCulled = false
    points.renderOrder   = 12

    // Set identification metadata for Raycaster click
    points.userData = {
      ensoType: 'currents',
      name: 'Equatorial Ocean Currents',
      desc: 'Flowing water in the Pacific Ocean. Normal state displays westward flow (cold upwelling circulation). During El Niño, currents reverse, flowing eastward toward Peru.'
    }

    scene.add(points)

    const startMs = performance.now()

    const unregister = registerAnimated((ensoTime) => {
      const elapsed = performance.now() - startMs
      material.uniforms.uOpacity.value = Math.min(elapsed / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value = ensoTime

      // Transition timeline for flow direction:
      // 0.0s – 4.0s: Normal (-1.0 Westward)
      // 4.0s – 10.0s: Slowing and reversing (-1.0 → +1.0)
      // 10.0s – 18.0s: El Nino (+1.0 Eastward)
      // 18.0s – 24.0s: Reversing back (+1.0 → -1.0)
      let directionVal = -1.0
      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        directionVal = -1.0 + 2.0 * ((ensoTime - 4.0) / 6.0)
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        directionVal = 1.0
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        directionVal = 1.0 - 2.0 * ((ensoTime - 18.0) / 6.0)
      }

      material.uniforms.uFlowDirection.value = directionVal
    })

    return () => {
      unregister()
      const fadeStart = performance.now()
      const curOpacity = material.uniforms.uOpacity.value
      const fadeOut = () => {
        const p = (performance.now() - fadeStart) / FADE_OUT_MS
        if (p < 1.0) {
          material.uniforms.uOpacity.value = curOpacity * (1.0 - p)
          requestAnimationFrame(fadeOut)
        } else {
          scene.remove(points)
          geo.dispose()
          material.dispose()
        }
      }
      requestAnimationFrame(fadeOut)
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
