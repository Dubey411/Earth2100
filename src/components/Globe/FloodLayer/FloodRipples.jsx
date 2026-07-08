// /**
//  * FloodRipples.jsx — Expanding concentric wave rings over flood hotspots.
//  *
//  * Three staggered rings per hotspot radiate outward to ~6.5° (≈ 720 km) radius
//  * over a 3-second period, fading as they expand.
//  * Uses additive blending for a luminous water-wave glow.
//  *
//  * Radius : 100.72 (just above Earth surface)
//  * Fade   : 600ms in, 500ms out
//  */
// import { useEffect } from 'react'
// import * as THREE from 'three'
// import { FLOOD_HOTSPOTS } from './constants'

// const RIPPLE_RADIUS = 100.72
// const FADE_IN_MS    = 600
// const FADE_OUT_MS   = 500

// // ── GLSL ─────────────────────────────────────────────────────────────────────
// const VERT = /* glsl */`
//   varying vec2 vUv;
//   varying vec3 vViewNormal;

//   void main() {
//     vUv         = uv;
//     vViewNormal = normalize(normalMatrix * normal);
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//   }
// `

// const FRAG = /* glsl */`
//   precision highp float;

//   uniform float uTime;
//   uniform float uOpacity;
//   uniform vec2  uHotspots[5];   // (lat, lng)

//   varying vec2 vUv;
//   varying vec3 vViewNormal;

//   void main() {
//     float lat    = (0.5 - vUv.y) * 180.0;
//     float lng    = (vUv.x - 0.5) * 360.0;
//     float cosLat = cos(radians(lat));

//     float totalWave = 0.0;

//     for (int i = 0; i < 5; i++) {
//       float dLat   = lat - uHotspots[i].x;
//       float dLng   = (lng - uHotspots[i].y) * cosLat;
//       float angDist = sqrt(dLat * dLat + dLng * dLng);

//       float maxR = 6.5;   // degrees → ~720 km

//       // Three overlapping ring waves, staggered by 1/3 period each
//       for (int w = 0; w < 3; w++) {
//         float offset = float(w) * 0.3333;
//         // Each hotspot gets a unique phase offset to avoid synchrony
//         float phase  = mod(uTime / 3.0 + offset + float(i) * 0.137, 1.0);
//         float radius = phase * maxR;

//         // Sharp ring: 1.0 at ring front, falls off over ±0.55°
//         float ringWidth = 0.55;
//         float dist      = abs(angDist - radius);
//         float wave      = max(0.0, 1.0 - dist / ringWidth);
//         wave = wave * wave; // sharpen

//         float fadeOut = 1.0 - phase;
//         float fadeIn  = smoothstep(0.0, 0.12, phase);

//         totalWave += wave * fadeOut * fadeIn;
//       }
//     }

//     totalWave = clamp(totalWave, 0.0, 1.0);
//     if (totalWave < 0.004) discard;

//     // Limb fade so rings don't appear at globe edge
//     float rim     = abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
//     float rimFade = smoothstep(0.0, 0.18, rim);

//     vec3  color = vec3(0.10, 0.52, 1.0);
//     float alpha = totalWave * 0.55 * uOpacity * rimFade;
//     if (alpha < 0.006) discard;

//     gl_FragColor = vec4(color, alpha);
//   }
// `

// // ── Component ─────────────────────────────────────────────────────────────────
// export default function FloodRipples({ scene, registerAnimated }) {
//   useEffect(() => {
//     const hotspotUniforms = FLOOD_HOTSPOTS.map(([lat, lng]) => new THREE.Vector2(lat, lng))

//     const material = new THREE.ShaderMaterial({
//       vertexShader:   VERT,
//       fragmentShader: FRAG,
//       uniforms: {
//         uTime:     { value: 0.0 },
//         uOpacity:  { value: 0.0 },
//         uHotspots: { value: hotspotUniforms },
//       },
//       transparent: true,
//       depthWrite:  false,
//       blending:    THREE.AdditiveBlending,
//       side:        THREE.FrontSide,
//     })

//     // Use a high-res sphere for smooth wave fronts
//     const geo  = new THREE.SphereGeometry(RIPPLE_RADIUS, 128, 128)
//     const mesh = new THREE.Mesh(geo, material)
//     mesh.rotation.y    = -Math.PI / 2
//     mesh.frustumCulled = false
//     mesh.renderOrder   = 7
//     scene.add(mesh)

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
//           scene.remove(mesh)
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
 * FloodRipples.jsx — Complex wave interference patterns over flood hotspots.
 * 
 * Enhanced: Multiple wave sources with interference, bright peaks.
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { FLOOD_HOTSPOTS } from './constants'

const RIPPLE_RADIUS = 100.72
const FADE_IN_MS    = 600
const FADE_OUT_MS   = 500

// ── GLSL ─────────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    vUv         = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uOpacity;
  uniform vec2  uHotspots[5];

  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    float lat    = (0.5 - vUv.y) * 180.0;
    float lng    = (vUv.x - 0.5) * 360.0;
    float cosLat = cos(radians(lat));

    // ── Multiple wave sources with interference ────────────────────────────
    float waveSum = 0.0;
    for (int i = 0; i < 5; i++) {
      float dLat = lat - uHotspots[i].x;
      float dLng = (lng - uHotspots[i].y) * cosLat;
      float dist = sqrt(dLat * dLat + dLng * dLng);
      
      float wave = sin(dist * 30.0 - uTime * 2.0 + float(i) * 1.2);
      wave = wave * 0.5 + 0.5;
      wave *= exp(-dist * 1.5);
      waveSum += wave * 0.2;
    }

    // ── Brighten at wave peaks ─────────────────────────────────────────────
    float brightness = 0.5 + 0.5 * waveSum;

    // ── Color shift: brighter = more white ─────────────────────────────────
    vec3 baseColor = vec3(0.1, 0.4, 0.9);
    vec3 brightColor = vec3(0.6, 0.8, 1.0);
    vec3 waveColor = mix(baseColor, brightColor, brightness);

    // ── Limb fade ───────────────────────────────────────────────────────────
    float rim     = abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
    float rimFade = smoothstep(0.0, 0.18, rim);

    float alpha = waveSum * 0.55 * uOpacity * rimFade;
    if (alpha < 0.006) discard;

    gl_FragColor = vec4(waveColor, alpha);
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function FloodRipples({ scene, registerAnimated }) {
  useEffect(() => {
    const hotspotUniforms = FLOOD_HOTSPOTS.map(([lat, lng]) => new THREE.Vector2(lat, lng))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:     { value: 0.0 },
        uOpacity:  { value: 0.0 },
        uHotspots: { value: hotspotUniforms },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.FrontSide,
    })

    const geo  = new THREE.SphereGeometry(RIPPLE_RADIUS, 128, 128)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y    = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 7
    scene.add(mesh)

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
          scene.remove(mesh)
          geo.dispose()
          material.dispose()
        }
      }
      requestAnimationFrame(fadeOut)
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}