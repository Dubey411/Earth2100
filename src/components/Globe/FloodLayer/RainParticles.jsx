// /**
//  * RainParticles.jsx — GPU rain particle system over flood hotspots.
//  *
//  * 4 500 particles fall radially inward from radius ~108 to ~100.5 (Earth surface).
//  * Each particle is an animated rain streak rendered as a gl_Point.
//  * Particles are distributed randomly within ±7° of each hotspot centre.
//  *
//  * Fade : 800ms in, 500ms out.
//  */
// import { useEffect } from 'react'
// import * as THREE from 'three'
// import { FLOOD_HOTSPOTS, latLngToLocalDir } from './constants'

// const PARTICLE_COUNT = 4500
// const RAIN_MAX_R     = 108.0
// const RAIN_MIN_R     = 100.5
// const FADE_IN_MS     = 800
// const FADE_OUT_MS    = 500

// // ── GLSL ─────────────────────────────────────────────────────────────────────
// const VERT = /* glsl */`
//   attribute vec3  aBaseDir;     // unit direction toward raindrop column
//   attribute float aBirthPhase;  // [0, 1) stagger each particle's birth
//   attribute float aSpeed;       // cycles per second

//   uniform float uTime;
//   uniform float uOpacity;

//   varying float vAlpha;

//   void main() {
//     // phase [0, 1): 0 = top (far from earth), 1 = surface impact
//     float phase = mod(uTime * aSpeed + aBirthPhase, 1.0);

//     // Linearly fall from RAIN_MAX_R to RAIN_MIN_R
//     float r   = mix(${RAIN_MAX_R.toFixed(1)}, ${RAIN_MIN_R.toFixed(1)}, phase);
//     vec3  pos = aBaseDir * r;

//     gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//     gl_PointSize = mix(16.0, 5.0, phase);   // shrink as it falls

//     // Fade out near impact, fade in at spawn
//     float fadeOut = 1.0 - smoothstep(0.82, 1.0, phase);
//     float fadeIn  = smoothstep(0.0, 0.07, phase);
//     vAlpha = fadeIn * fadeOut * uOpacity;
//   }
// `

// const FRAG = /* glsl */`
//   precision mediump float;
//   varying float vAlpha;

//   void main() {
//     // gl_PointCoord: (0,0) top-left, (1,1) bottom-right
//     vec2  coord = gl_PointCoord - 0.5;           // center at origin
//     float xDist = abs(coord.x);
//     float yFade = coord.y + 0.5;                 // 0 at top, 1 at bottom

//     // Discard wide pixels → thin streak
//     if (xDist > 0.13) discard;

//     // Fade along streak length (bright top, dim bottom)
//     float alpha = (1.0 - yFade * 0.65) * vAlpha;
//     if (alpha < 0.01) discard;

//     // Ice-blue raindrop colour
//     gl_FragColor = vec4(0.47, 0.84, 1.0, alpha);
//   }
// `

// // ── Component ─────────────────────────────────────────────────────────────────
// export default function RainParticles({ scene, registerAnimated }) {
//   useEffect(() => {
//     const count = PARTICLE_COUNT
//     const positions   = new Float32Array(count * 3)
//     const baseDirs    = new Float32Array(count * 3)
//     const birthPhases = new Float32Array(count)
//     const speeds      = new Float32Array(count)

//     for (let i = 0; i < count; i++) {
//       const hs  = FLOOD_HOTSPOTS[Math.floor(Math.random() * FLOOD_HOTSPOTS.length)]
//       const lat = hs[0] + (Math.random() - 0.5) * 14.0
//       const lng = hs[1] + (Math.random() - 0.5) * 14.0

//       const d = latLngToLocalDir(lat, lng)
//       baseDirs[i * 3]     = d.x
//       baseDirs[i * 3 + 1] = d.y
//       baseDirs[i * 3 + 2] = d.z

//       // Initial visible position (the shader overrides this every frame)
//       const phase = Math.random()
//       const r     = RAIN_MAX_R + (RAIN_MIN_R - RAIN_MAX_R) * phase
//       positions[i * 3]     = d.x * r
//       positions[i * 3 + 1] = d.y * r
//       positions[i * 3 + 2] = d.z * r

//       birthPhases[i] = Math.random()
//       speeds[i]      = 0.28 + Math.random() * 0.38   // 0.28–0.66 cycles/s
//     }

//     const geo = new THREE.BufferGeometry()
//     geo.setAttribute('position',    new THREE.BufferAttribute(positions,   3))
//     geo.setAttribute('aBaseDir',    new THREE.BufferAttribute(baseDirs,    3))
//     geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(birthPhases, 1))
//     geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds,      1))

//     const material = new THREE.ShaderMaterial({
//       vertexShader:   VERT,
//       fragmentShader: FRAG,
//       uniforms: {
//         uTime:    { value: 0.0 },
//         uOpacity: { value: 0.0 },
//       },
//       transparent: true,
//       depthWrite:  false,
//       blending:    THREE.AdditiveBlending,
//     })

//     const points = new THREE.Points(geo, material)
//     points.rotation.y    = -Math.PI / 2
//     points.frustumCulled = false
//     points.renderOrder   = 8
//     scene.add(points)

//     const startMs = performance.now()

//     const unregister = registerAnimated((t) => {
//       material.uniforms.uOpacity.value = Math.min((performance.now() - startMs) / FADE_IN_MS, 1.0)
//       material.uniforms.uTime.value    = t
//     })

//     return () => {
//       unregister()
//       const fadeStart  = performance.now()
//       const curOpacity = material.uniforms.uOpacity.value

//       const fadeOut = () => {
//         const p = (performance.now() - fadeStart) / FADE_OUT_MS
//         if (p < 1.0) {
//           material.uniforms.uOpacity.value = curOpacity * (1.0 - p)
//           requestAnimationFrame(fadeOut)
//         } else {
//           scene.remove(points)
//           geo.dispose()
//           material.dispose()
//         }
//       }
//       requestAnimationFrame(fadeOut)
//     }
//   }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

//   return null
// }






/**
 * RainParticles.jsx — GPU rain particle system with splash effects.
 * 
 * Enhanced: More particles (8000), ground splashes, better streak rendering.
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { FLOOD_HOTSPOTS, latLngToLocalDir } from './constants'

const RAIN_COUNT = 8000
const SPLASH_COUNT = 2000
const RAIN_MAX_R     = 108.0
const RAIN_MIN_R     = 100.5
const FADE_IN_MS     = 800
const FADE_OUT_MS    = 500

// ── GLSL ─────────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
  attribute vec3  aBaseDir;
  attribute float aBirthPhase;
  attribute float aSpeed;
  attribute float aIsSplash;   // 0 = rain, 1 = splash

  uniform float uTime;
  uniform float uOpacity;

  varying float vAlpha;
  varying float vIsSplash;

  void main() {
    vIsSplash = aIsSplash;
    float phase = mod(uTime * aSpeed + aBirthPhase, 1.0);

    // Rain: fall from top to surface
    float r = mix(${RAIN_MAX_R.toFixed(1)}, ${RAIN_MIN_R.toFixed(1)}, phase);
    vec3 pos = aBaseDir * r;

    // Splash: expand outward at surface
    if (aIsSplash > 0.5 && phase > 0.85) {
      float splashRadius = (phase - 0.85) * 15.0;
      vec3 tangent = normalize(cross(aBaseDir, vec3(0.0, 1.0, 0.0)));
      pos += (tangent * sin(phase * 20.0 + aBirthPhase * 6.28) +
              cross(aBaseDir, tangent) * cos(phase * 20.0 + aBirthPhase * 6.28)) * splashRadius;
    }

    gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aIsSplash > 0.5 ? mix(8.0, 2.0, phase) : mix(16.0, 5.0, phase);

    float fadeOut = 1.0 - smoothstep(0.82, 1.0, phase);
    float fadeIn  = smoothstep(0.0, 0.07, phase);
    vAlpha = fadeIn * fadeOut * uOpacity;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;
  varying float vIsSplash;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float xDist = abs(coord.x);
    float yFade = coord.y + 0.5;

    // Rain streak: thin vertical line
    if (vIsSplash < 0.5 && xDist > 0.13) discard;

    // Splash: circular drop
    if (vIsSplash > 0.5 && length(coord) > 0.5) discard;

    float alpha = (1.0 - yFade * 0.65) * vAlpha;
    if (alpha < 0.01) discard;

    vec3 color = vIsSplash > 0.5 ?
      vec3(0.6, 0.9, 1.0) :
      vec3(0.47, 0.84, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function RainParticles({ scene, registerAnimated }) {
  useEffect(() => {
    const total = RAIN_COUNT + SPLASH_COUNT
    const positions   = new Float32Array(total * 3)
    const baseDirs    = new Float32Array(total * 3)
    const birthPhases = new Float32Array(total)
    const speeds      = new Float32Array(total)
    const isSplash    = new Float32Array(total)

    for (let i = 0; i < total; i++) {
      const isS = i >= RAIN_COUNT
      const hs = FLOOD_HOTSPOTS[Math.floor(Math.random() * FLOOD_HOTSPOTS.length)]
      const spread = isS ? 3.0 : 14.0
      const lat = hs[0] + (Math.random() - 0.5) * spread
      const lng = hs[1] + (Math.random() - 0.5) * spread

      const d = latLngToLocalDir(lat, lng)
      baseDirs[i * 3]     = d.x
      baseDirs[i * 3 + 1] = d.y
      baseDirs[i * 3 + 2] = d.z

      const phase = Math.random()
      const r     = RAIN_MAX_R + (RAIN_MIN_R - RAIN_MAX_R) * phase
      positions[i * 3]     = d.x * r
      positions[i * 3 + 1] = d.y * r
      positions[i * 3 + 2] = d.z * r

      birthPhases[i] = Math.random()
      speeds[i]      = isS ? 0.15 + Math.random() * 0.2 : 0.28 + Math.random() * 0.38
      isSplash[i]    = isS ? 1.0 : 0.0
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(positions,   3))
    geo.setAttribute('aBaseDir',    new THREE.BufferAttribute(baseDirs,    3))
    geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(birthPhases, 1))
    geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds,      1))
    geo.setAttribute('aIsSplash',   new THREE.BufferAttribute(isSplash,    1))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:    { value: 0.0 },
        uOpacity: { value: 0.0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, material)
    points.rotation.y    = -Math.PI / 2
    points.frustumCulled = false
    points.renderOrder   = 8
    scene.add(points)

    const startMs = performance.now()

    const unregister = registerAnimated((t) => {
      material.uniforms.uOpacity.value = Math.min((performance.now() - startMs) / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value    = t
    })

    return () => {
      unregister()
      const fadeStart  = performance.now()
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