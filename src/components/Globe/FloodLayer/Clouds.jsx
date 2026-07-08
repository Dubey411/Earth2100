// /**
//  * Clouds.jsx — Storm cloud sphere rendered only near flood hotspots.
//  *
//  * Radius  : 100.8 (slightly above Earth at 100)
//  * Opacity : 0.35 max, masked to hotspot regions (σ = 12°)
//  * Effect  : Slow drift via fBm noise + lightning brightening
//  * Fade    : 800ms in, 500ms out
//  */
// import { useEffect } from 'react'
// import * as THREE from 'three'
// import { FLOOD_HOTSPOTS } from './constants'

// const CLOUD_RADIUS = 100.8
// const FADE_IN_MS   = 800
// const FADE_OUT_MS  = 500

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
//   uniform float uLightning;      // 0-1, decays per flash
//   uniform vec2  uHotspots[5];   // (lat, lng) per hotspot

//   varying vec2 vUv;
//   varying vec3 vViewNormal;

//   // ── Value noise & fBm ─────────────────────────────────────────────────────
//   float hash(vec2 p) {
//     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
//   }
//   float noise(vec2 p) {
//     vec2 i = floor(p), f = fract(p);
//     float a = hash(i), b = hash(i + vec2(1,0));
//     float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
//     vec2 u  = f * f * (3.0 - 2.0 * f);
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
//   }
//   float fbm(vec2 p) {
//     float v = 0.0, a = 0.5;
//     for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
//     return v;
//   }

//   void main() {
//     float lat    = (0.5 - vUv.y) * 180.0;
//     float lng    = (vUv.x - 0.5) * 360.0;
//     float cosLat = cos(radians(lat));

//     // ── Hotspot proximity mask ──────────────────────────────────────────────
//     float mask = 0.0;
//     for (int i = 0; i < 5; i++) {
//       float dLat = lat - uHotspots[i].x;
//       float dLng = (lng - uHotspots[i].y) * cosLat;
//       float d2   = dLat * dLat + dLng * dLng;
//       mask += exp(-d2 / (2.0 * 144.0)); // sigma = 12°
//     }
//     mask = clamp(mask, 0.0, 1.0);
//     if (mask < 0.01) discard;

//     // ── Animated storm noise ────────────────────────────────────────────────
//     vec2 drift = vUv * 7.0 + vec2(uTime * 0.013, uTime * 0.008);
//     float n1   = fbm(drift);
//     float n2   = fbm(drift * 1.4 + 5.71);
//     float cloud = n1 * 0.6 + n2 * 0.4;
//     cloud = smoothstep(0.33, 0.74, cloud);

//     // ── Occasional darker patch via second noise layer ─────────────────────
//     float darker = fbm(drift * 0.6 + 2.3);
//     cloud *= 0.7 + 0.3 * smoothstep(0.55, 0.9, darker);

//     // ── Lightning brightening ───────────────────────────────────────────────
//     vec3 baseColor = mix(
//       vec3(0.07, 0.09, 0.16),   // dark storm grey
//       vec3(0.75, 0.88, 1.00),   // bright flash
//       uLightning * 0.55
//     );

//     // ── Edge / limb fade ────────────────────────────────────────────────────
//     float rim     = abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
//     float rimFade = smoothstep(0.0, 0.22, rim);

//     float alpha = cloud * mask * uOpacity * rimFade * 0.35;
//     if (alpha < 0.004) discard;

//     gl_FragColor = vec4(baseColor, alpha);
//   }
// `

// // ── Component ─────────────────────────────────────────────────────────────────
// export default function Clouds({ scene, lightningRef, registerAnimated }) {
//   useEffect(() => {
//     const hotspotUniforms = FLOOD_HOTSPOTS.map(([lat, lng]) => new THREE.Vector2(lat, lng))

//     const material = new THREE.ShaderMaterial({
//       vertexShader:   VERT,
//       fragmentShader: FRAG,
//       uniforms: {
//         uTime:      { value: 0.0 },
//         uOpacity:   { value: 0.0 },
//         uLightning: { value: 0.0 },
//         uHotspots:  { value: hotspotUniforms },
//       },
//       transparent: true,
//       depthWrite:  false,
//       blending:    THREE.NormalBlending,
//       side:        THREE.FrontSide,
//     })

//     const geo  = new THREE.SphereGeometry(CLOUD_RADIUS, 64, 64)
//     const mesh = new THREE.Mesh(geo, material)
//     mesh.rotation.y   = -Math.PI / 2
//     mesh.frustumCulled = false
//     mesh.renderOrder   = 6
//     scene.add(mesh)

//     const startMs = performance.now()

//     const unregister = registerAnimated((t) => {
//       const elapsed = performance.now() - startMs
//       material.uniforms.uOpacity.value   = Math.min(elapsed / FADE_IN_MS, 1.0)
//       material.uniforms.uTime.value      = t
//       material.uniforms.uLightning.value = lightningRef.current.value
//     })

//     return () => {
//       unregister()
//       // Fade out, then dispose
//       const fadeStart = performance.now()
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
 * Clouds.jsx — Storm cloud sphere with rolling motion and lightning brightening.
 * 
 * Enhanced: Rolling cloud animation, internal lightning glow, forked bolts.
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { FLOOD_HOTSPOTS } from './constants'

const CLOUD_RADIUS = 100.8
const FADE_IN_MS   = 800
const FADE_OUT_MS  = 500

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
  uniform float uLightning;      // 0-1, decays per flash
  uniform vec2  uHotspots[5];   // (lat, lng) per hotspot

  varying vec2 vUv;
  varying vec3 vViewNormal;

  // ── Value noise & fBm ─────────────────────────────────────────────────────
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
    vec2 u  = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    float lat    = (0.5 - vUv.y) * 180.0;
    float lng    = (vUv.x - 0.5) * 360.0;
    float cosLat = cos(radians(lat));

    // ── Hotspot proximity mask ──────────────────────────────────────────────
    float mask = 0.0;
    for (int i = 0; i < 5; i++) {
      float dLat = lat - uHotspots[i].x;
      float dLng = (lng - uHotspots[i].y) * cosLat;
      float d2   = dLat * dLat + dLng * dLng;
      mask += exp(-d2 / (2.0 * 144.0));
    }
    mask = clamp(mask, 0.0, 1.0);
    if (mask < 0.01) discard;

    // ── Rolling cloud animation ─────────────────────────────────────────────
    vec2 drift = vUv * 7.0 + vec2(uTime * 0.013, uTime * 0.008);
    float n1   = fbm(drift);
    float n2   = fbm(drift * 1.4 + 5.71);
    float cloud = n1 * 0.6 + n2 * 0.4;
    cloud = smoothstep(0.33, 0.74, cloud);

    // ── Darker patch via second noise layer ─────────────────────────────────
    float darker = fbm(drift * 0.6 + 2.3);
    cloud *= 0.7 + 0.3 * smoothstep(0.55, 0.9, darker);

    // ── Edge glow from lightning ────────────────────────────────────────────
    float glow = uLightning * 0.8;
    vec3 cloudColor = mix(
      vec3(0.05, 0.08, 0.15),
      vec3(0.7, 0.8, 1.0),
      glow
    );

    // ── Forked lightning bolts ──────────────────────────────────────────────
    if (uLightning > 0.3) {
      float bolt = pow(fbm(vUv * 30.0 + uTime * 100.0), 20.0);
      cloudColor += bolt * vec3(1.0, 0.9, 1.0) * uLightning * 0.5;
    }

    // ── Limb fade ────────────────────────────────────────────────────────────
    float rim     = abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
    float rimFade = smoothstep(0.0, 0.22, rim);

    float alpha = cloud * mask * uOpacity * rimFade * 0.35;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(cloudColor, alpha);
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function Clouds({ scene, lightningRef, registerAnimated }) {
  useEffect(() => {
    const hotspotUniforms = FLOOD_HOTSPOTS.map(([lat, lng]) => new THREE.Vector2(lat, lng))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:      { value: 0.0 },
        uOpacity:   { value: 0.0 },
        uLightning: { value: 0.0 },
        uHotspots:  { value: hotspotUniforms },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
      side:        THREE.FrontSide,
    })

    const geo  = new THREE.SphereGeometry(CLOUD_RADIUS, 64, 64)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y   = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 6
    scene.add(mesh)

    const startMs = performance.now()

    const unregister = registerAnimated((t) => {
      const elapsed = performance.now() - startMs
      material.uniforms.uOpacity.value   = Math.min(elapsed / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value      = t
      material.uniforms.uLightning.value = lightningRef.current.value
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