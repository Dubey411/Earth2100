/**
 * FloodRings.jsx — Expanding cyan shock rings (v4, live-data ready).
 *
 * Accepts a `hotspots` prop (array of {lat, lng}) so it renders rings at
 * live GDACS flood locations or static fallback positions.
 *
 * The GLSL shader uses uniform vec2 uHotspots[5] (fixed compile-time size).
 * We always normalise to exactly 5 slots: truncate if more, pad [0,0] if fewer.
 *
 * Key improvements:
 *  - Much wider rings (1.2° width) and higher alpha (0.85)
 *  - Brighter cyan (0.2, 0.9, 1.0)
 *  - 4 rings per hotspot (was 3) for more continuous appearance
 *  - Per-hotspot phase offsets prevent synchrony
 *  - Cubic sharpening for crisp ring edges
 *  - Additive blending: rings glow ON TOP of everything
 *
 * Radius : 100.70
 * Fade   : 600ms in, 400ms out
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const RIPPLE_RADIUS = 100.70
const FADE_IN_MS    = 600
const FADE_OUT_MS   = 400
const SHADER_SLOTS  = 5   // GLSL compile-time constant

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv         = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uOpacity;
  uniform vec2  uHotspots[5];

  varying vec2 vUv;

  // One ring wave contribution: cubic-sharpened, fade-out as it expands
  float ring(float dist, float phase, float maxR) {
    float radius = phase * maxR;
    float width  = 1.20;         // degrees — wide enough to be very visible
    float d      = abs(dist - radius);
    float w      = max(0.0, 1.0 - d / width);
    w = w * w * w;               // cubic: crisp centre, soft edge
    return w * (1.0 - phase) * smoothstep(0.0, 0.08, phase);
  }

  // 4 staggered rings from one hotspot
  float hotspot(vec2 hs, float lat, float lng, float cosLat, float t) {
    float dLat = lat - hs.x;
    float dLng = (lng - hs.y) * cosLat;
    float dist = sqrt(dLat*dLat + dLng*dLng);
    float maxR = 8.0;    // degrees — ~890 km
    float period = 3.5;  // seconds per ring cycle

    return ring(dist, mod(t/period,           1.0), maxR)
         + ring(dist, mod(t/period + 0.25,    1.0), maxR)
         + ring(dist, mod(t/period + 0.50,    1.0), maxR)
         + ring(dist, mod(t/period + 0.75,    1.0), maxR);
  }

  void main() {
    float lat    = (0.5 - vUv.y) * 180.0;
    float lng    = (vUv.x - 0.5) * 360.0;
    float cosLat = cos(radians(lat));

    // Each hotspot offset by 0.7 s so they're never all at same phase
    float total =
      hotspot(uHotspots[0], lat, lng, cosLat, uTime + 0.00)
    + hotspot(uHotspots[1], lat, lng, cosLat, uTime + 0.70)
    + hotspot(uHotspots[2], lat, lng, cosLat, uTime + 1.40)
    + hotspot(uHotspots[3], lat, lng, cosLat, uTime + 2.10)
    + hotspot(uHotspots[4], lat, lng, cosLat, uTime + 2.80);

    total = clamp(total, 0.0, 1.0);
    if (total < 0.01) discard;

    // Bright electric cyan + white core for max visibility
    float whiteMix = smoothstep(0.6, 1.0, total);
    vec3 color     = mix(vec3(0.15, 0.88, 1.0), vec3(1.0, 1.0, 1.0), whiteMix);

    float alpha    = total * 0.85 * uOpacity;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
  }
`

/** Normalise any hotspot array to exactly SHADER_SLOTS THREE.Vector2 items. */
function toHotspotUniforms(hotspots) {
  return Array.from({ length: SHADER_SLOTS }, (_, i) => {
    const h = hotspots[i]
    return h ? new THREE.Vector2(h.lat, h.lng) : new THREE.Vector2(0, 0)
  })
}

export default function FloodRings({ scene, registerAnimated, hotspots = [] }) {
  useEffect(() => {
    const hotspotUniforms = toHotspotUniforms(hotspots)

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

    const geo  = new THREE.SphereGeometry(RIPPLE_RADIUS, 160, 160)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y    = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 8

    // Set identification metadata for click handler
    mesh.userData = {
      floodType: 'ripple',
      name: 'Dynamic Wave Ripples'
    }

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
          scene.remove(mesh); geo.dispose(); material.dispose()
        }
      }
      requestAnimationFrame(fadeOut)
    }
  }, [scene, hotspots]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
