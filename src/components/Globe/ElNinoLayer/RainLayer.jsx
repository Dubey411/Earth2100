/**
 * RainLayer.jsx — GPU Rain Particle System driven by warm pool position.
 *
 * Simulates precipitation falling from storm clouds to the ocean.
 * Rain particles (1,500 points) fall radially inward from radius 103.0 to 100.4.
 *
 * Rainfall location dynamically shifts:
 *   - Normal state: Rain falls over Indonesia (West Pacific).
 *   - El Niño state: Rain shifts to the Central and Eastern Pacific.
 *
 * Blending: Additive blending for rain streaks.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const RAIN_MAX_R = 103.0
const RAIN_MIN_R = 100.4
const PARTICLE_COUNT = 1500
const FADE_IN_MS     = 1000
const FADE_OUT_MS    = 600

const VERT = /* glsl */`
  attribute float aLat;
  attribute float aLng; // [120, 280]
  attribute float aBirthPhase;
  attribute float aSpeed;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uWarmCenter; // [0, 1] West Pacific to East Pacific

  varying float vAlpha;

  void main() {
    // Determine the warm center longitude coordinate (120E to 80W)
    float centerLng = mix(135.0, 245.0, uWarmCenter);
    float dist = abs(aLng - centerLng);

    // Rain only falls close to the warm SST pool (Gaussian rain envelope, sigma = 22°)
    float rainWeight = exp(-(dist * dist) / 500.0);

    // Staggered radial fall phase [0, 1)
    float phase = mod(uTime * aSpeed + aBirthPhase, 1.0);
    float r = mix(${RAIN_MAX_R.toFixed(2)}, ${RAIN_MIN_R.toFixed(2)}, phase);

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

    // Rain streak point size: larger near top, fades near impact
    gl_PointSize = mix(12.0, 4.0, phase);

    // Fade-in at spawn, fade-out near impact
    float fadeIn = smoothstep(0.0, 0.08, phase);
    float fadeOut = 1.0 - smoothstep(0.85, 1.0, phase);
    float latFade = smoothstep(11.0, 0.0, abs(aLat));

    // Force size to 0 if outside active rain zone
    if (rainWeight < 0.08) {
      gl_PointSize = 0.0;
    }

    vAlpha = fadeIn * fadeOut * latFade * rainWeight * uOpacity * 0.70;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;

  void main() {
    // Render as thin vertical rain streaks (streaks are vertical in pointCoord)
    vec2 coord = gl_PointCoord - 0.5;
    if (abs(coord.x) > 0.08) discard; // very thin streak
    if (coord.y + 0.5 > 1.0) discard;

    float fade = 1.0 - (coord.y + 0.5); // fade towards base of streak
    vec3 color = vec3(0.5, 0.75, 1.0); // soft blue rain

    gl_FragColor = vec4(color, fade * vAlpha);
  }
`

export default function RainLayer({ globe, scene, registerAnimated }) {
  useEffect(() => {
    if (!globe) return

    const lats        = new Float32Array(PARTICLE_COUNT)
    const lngs        = new Float32Array(PARTICLE_COUNT)
    const birthPhases = new Float32Array(PARTICLE_COUNT)
    const speeds      = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Rainfall lat [-8, 8]
      lats[i]        = (Math.random() - 0.5) * 16.0
      // 120E to 80W (280E)
      lngs[i]        = 120.0 + Math.random() * 160.0
      birthPhases[i] = Math.random()
      speeds[i]      = 0.32 + Math.random() * 0.28
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
        uTime:        { value: 0.0 },
        uOpacity:     { value: 0.0 },
        uWarmCenter:  { value: 0.0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, material)
    points.frustumCulled = false
    points.renderOrder   = 15

    points.userData = {
      ensoType: 'rain',
      name: 'GPU Rain Precipitation',
      desc: 'Visualizes the dynamic rainfall shift in the Pacific. Normally concentrated in the West (Indonesia), the rain belt slides across the ocean, bringing flooding to Peru and droughts to Southeast Asia.'
    }

    scene.add(points)

    const startMs = performance.now()

    const unregister = registerAnimated((ensoTime) => {
      const elapsed = performance.now() - startMs
      material.uniforms.uOpacity.value = Math.min(elapsed / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value = ensoTime

      // Sync rain center with warm SST center
      let warmVal = 0.0
      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        warmVal = (ensoTime - 4.0) / 6.0
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        warmVal = 1.0
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        warmVal = 1.0 - (ensoTime - 18.0) / 6.0
      }

      const easedWarmVal = THREE.MathUtils.smoothstep(warmVal, 0.0, 1.0)
      material.uniforms.uWarmCenter.value = easedWarmVal
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
