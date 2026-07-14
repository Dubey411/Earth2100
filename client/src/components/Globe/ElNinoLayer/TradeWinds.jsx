/**
 * TradeWinds.jsx — Walker Circulation Trade Winds above the Pacific.
 *
 * Volumetric white flowing wind particles at radius 102.5.
 *
 * Behavior:
 *   - Normal state: Strong westward trade winds.
 *   - El Niño state: Trade winds weaken, slow down, and some reverse.
 *
 * Blending: Additive blending for soft glowing white wind streaks.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const WINDS_RADIUS = 102.5
const PARTICLE_COUNT = 900
const FADE_IN_MS     = 1000
const FADE_OUT_MS    = 600

const VERT = /* glsl */`
  attribute float aLat;
  attribute float aStartLng;
  attribute float aBirthPhase;
  attribute float aSpeed;
  attribute float aWindOffset; // unique offset to reverse some winds

  uniform float uTime;
  uniform float uOpacity;
  uniform float uWindIntensity; // 1.0 = Strong Normal, 0.20 = Weak El Nino
  uniform float uFlowDirection;  // -1.0 = Westward, +1.0 = Eastward

  varying float vAlpha;

  void main() {
    // Under normal conditions, winds move fast (8.5 degrees/sec).
    // Under El Nino, they slow down drastically and some reverse based on aWindOffset.
    float dir = uFlowDirection;
    if (uWindIntensity < 0.45 && aWindOffset > 0.50) {
      dir = 1.0; // reverse a subset of wind particles during El Nino
    }

    float speed = aSpeed * dir * mix(2.2, 8.5, uWindIntensity);
    float lngRange = 160.0;

    float rawLng = aStartLng + uTime * speed + aBirthPhase * lngRange;
    float lng = mod(rawLng - 120.0, lngRange) + 120.0;

    // Convert geographic coordinates to 3D Cartesian coordinates
    float phi   = (90.0 - aLat) * 3.14159265 / 180.0;
    float theta = (90.0 - lng) * 3.14159265 / 180.0;

    vec3 pos = vec3(
      ${WINDS_RADIUS.toFixed(2)} * sin(phi) * cos(theta),
      ${WINDS_RADIUS.toFixed(2)} * cos(phi),
      ${WINDS_RADIUS.toFixed(2)} * sin(phi) * sin(theta)
    );

    // Align with EarthGlobe mesh.rotation.y = -PI/2
    vec3 rotatedPos = vec3(-pos.z, pos.y, pos.x);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(rotatedPos, 1.0);

    // Fade out near the boundaries of the Pacific basin
    float normLng = (lng - 120.0) / lngRange;
    float lngFade = smoothstep(0.0, 0.12, normLng) * smoothstep(1.0, 0.88, normLng);

    // Narrow latitudonal band for Walker circulation winds
    float latFade = smoothstep(10.0, 0.0, abs(aLat));

    gl_PointSize = mix(2.2, 3.8, fract(aBirthPhase * 7.0));

    // Reduce overall wind density/alpha during El Nino (weak wind state)
    float densityFade = mix(0.38, 1.0, uWindIntensity);
    vAlpha = lngFade * latFade * densityFade * uOpacity * 0.70;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    if (dist > 0.5) discard;

    float glow = smoothstep(0.5, 0.15, dist);
    // Soft pure-white trade wind color
    vec3 color = vec3(0.95, 0.98, 1.00);

    gl_FragColor = vec4(color, glow * vAlpha);
  }
`

export default function TradeWinds({ scene, registerAnimated }) {
  useEffect(() => {
    const lats         = new Float32Array(PARTICLE_COUNT)
    const startLngs   = new Float32Array(PARTICLE_COUNT)
    const birthPhases = new Float32Array(PARTICLE_COUNT)
    const speeds      = new Float32Array(PARTICLE_COUNT)
    const offsets     = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Confine to Equatorial Pacific winds: lat [-9, 9]
      lats[i]        = (Math.random() - 0.5) * 18.0
      startLngs[i]   = 120.0 + Math.random() * 160.0
      birthPhases[i] = Math.random()
      speeds[i]      = 0.80 + Math.random() * 0.40
      offsets[i]     = Math.random()
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    geo.setAttribute('aLat',        new THREE.BufferAttribute(lats, 1))
    geo.setAttribute('aStartLng',   new THREE.BufferAttribute(startLngs, 1))
    geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(birthPhases, 1))
    geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aWindOffset', new THREE.BufferAttribute(offsets, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:          { value: 0.0 },
        uOpacity:       { value: 0.0 },
        uWindIntensity: { value: 1.0 }, // 1.0 = Normal (Strong), 0.20 = El Nino (Weak)
        uFlowDirection: { value: -1.0 }, // Westward
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, material)
    points.frustumCulled = false
    points.renderOrder   = 13

    // Set identification metadata for Raycaster click
    points.userData = {
      ensoType: 'winds',
      name: 'Walker Circulation Trade Winds',
      desc: 'Atmospheric trade winds blowing above the equatorial Pacific. In normal states, strong east-to-west winds accumulate warm water in the West. During El Niño, these winds weaken or collapse entirely.'
    }

    scene.add(points)

    const startMs = performance.now()

    const unregister = registerAnimated((ensoTime) => {
      const elapsed = performance.now() - startMs
      material.uniforms.uOpacity.value = Math.min(elapsed / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value = ensoTime

      // Transition timeline for winds:
      // 0.0s – 4.0s: Strong Normal (intensity = 1.0, dir = -1)
      // 4.0s – 10.0s: Weakening (intensity drops 1.0 → 0.25, dir moves towards 0)
      // 10.0s – 18.0s: Weak/Reversed (intensity = 0.25, dir = +0.2)
      // 18.0s – 24.0s: Strengthening back to Normal (intensity 0.25 → 1.0, dir = -1)
      let intensityVal = 1.0
      let directionVal = -1.0

      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        const p = (ensoTime - 4.0) / 6.0
        intensityVal = 1.0 - 0.75 * p
        directionVal = -1.0 + 1.25 * p // slow down & drift slightly east
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        intensityVal = 0.25
        directionVal = 0.25 // slight weak eastward drift
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        const p = (ensoTime - 18.0) / 6.0
        intensityVal = 0.25 + 0.75 * p
        directionVal = 0.25 - 1.25 * p
      }

      material.uniforms.uWindIntensity.value = intensityVal
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
