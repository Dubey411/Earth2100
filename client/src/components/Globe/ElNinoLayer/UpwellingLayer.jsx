/**
 * UpwellingLayer.jsx — Cold Deep-Water Upwelling off the Peru Coast.
 *
 * Renders vertical rising cold-water particles along the coast of Peru (lat [-12, -3], lng [-83, -77]).
 *
 * Behavior:
 *   - Normal state: Strong upwelling (bright blue vertical particles rising from deep ocean).
 *   - El Niño state: Upwelling weakens and shuts down (particles fade out and disappear).
 *
 * Blending: Additive blending for a deep cold-blue glow.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const MIN_R = 99.4
const MAX_R = 100.15
const PARTICLE_COUNT = 300
const FADE_IN_MS     = 1000
const FADE_OUT_MS    = 600

const VERT = /* glsl */`
  attribute float aLat;
  attribute float aLng;
  attribute float aBirthPhase;
  attribute float aSpeed;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uUpwellingIntensity; // 1.0 = Normal (active), 0.0 = El Nino (shut down)

  varying float vAlpha;

  void main() {
    // Staggered vertical rise from deep ocean (99.4) to surface (100.15)
    float phase = mod(uTime * aSpeed + aBirthPhase, 1.0);
    float r = mix(${MIN_R.toFixed(2)}, ${MAX_R.toFixed(2)}, phase);

    // Translate lat/lng to Cartesian
    float phi   = (90.0 - aLat) * 3.14159265 / 180.0;
    float theta = (90.0 - aLng) * 3.14159265 / 180.0;

    vec3 pos = vec3(
      r * sin(phi) * cos(theta),
      r * cos(phi),
      r * sin(phi) * sin(theta)
    );

    // Rotate Y by -PI/2
    vec3 rotatedPos = vec3(-pos.z, pos.y, pos.x);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(rotatedPos, 1.0);

    // Scale particle size based on depth (larger near surface) and intensity
    gl_PointSize = mix(2.0, 5.0, phase) * uUpwellingIntensity;

    // Fade-in at depth, fade-out at surface impact
    float fadeIn = smoothstep(0.0, 0.15, phase);
    float fadeOut = 1.0 - smoothstep(0.85, 1.0, phase);

    vAlpha = fadeIn * fadeOut * uUpwellingIntensity * uOpacity * 0.85;
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
    // Cold deep-ocean cyan-blue color
    vec3 color = vec3(0.05, 0.50, 0.95);

    gl_FragColor = vec4(color, glow * vAlpha);
  }
`

export default function UpwellingLayer({ globe, scene, registerAnimated }) {
  useEffect(() => {
    if (!globe) return

    const lats        = new Float32Array(PARTICLE_COUNT)
    const lngs        = new Float32Array(PARTICLE_COUNT)
    const birthPhases = new Float32Array(PARTICLE_COUNT)
    const speeds      = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Confine strictly to coastal Peru upwelling zone: lat [-12, -3], lng [-83, -77]
      lats[i]        = -12.0 + Math.random() * 9.0
      lngs[i]        = -83.0 + Math.random() * 6.0
      birthPhases[i] = Math.random()
      speeds[i]      = 0.28 + Math.random() * 0.22
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    geo.setAttribute('aLat',        new THREE.BufferAttribute(lats, 1))
    geo.setAttribute('aLng',        new THREE.BufferAttribute(lngs, 1))
    geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(birthPhases, 1))
    geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:               { value: 0.0 },
        uOpacity:            { value: 0.0 },
        uUpwellingIntensity: { value: 1.0 }, // 1.0 = Normal (Active), 0.0 = El Nino (Absent)
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, material)
    points.frustumCulled = false
    points.renderOrder   = 11

    points.userData = {
      ensoType: 'upwelling',
      name: 'Cold Water Upwelling (Peru)',
      desc: 'Vertical flow of cold nutrient-rich deep water. Normally, strong trade winds push warm surface water west, allowing cold deep water to rise off Peru. When trade winds weaken during El Niño, this upwelling stops.'
    }

    scene.add(points)

    const startMs = performance.now()

    const unregister = registerAnimated((ensoTime) => {
      const elapsed = performance.now() - startMs
      material.uniforms.uOpacity.value = Math.min(elapsed / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value = ensoTime

      // Transition timeline for upwelling:
      // 0.0s – 4.0s: Active Normal (intensity = 1.0)
      // 4.0s – 10.0s: Reducing (intensity 1.0 → 0.0)
      // 10.0s – 18.0s: Shut down (intensity = 0.0)
      // 18.0s – 24.0s: Recovering (intensity 0.0 → 1.0)
      let upwellingVal = 1.0
      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        upwellingVal = 1.0 - (ensoTime - 4.0) / 6.0
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        upwellingVal = 0.0
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        upwellingVal = (ensoTime - 18.0) / 6.0
      }

      material.uniforms.uUpwellingIntensity.value = upwellingVal
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
  }, [globe, scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
