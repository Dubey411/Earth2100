/**
 * FloodPulse.jsx — Bright animated flood water blobs on globe surface.
 *
 * Accepts a `hotspots` prop (array of {lat, lng}) so it renders blobs at
 * live GDACS flood locations or static fallback positions.
 *
 * The GLSL shader uses uniform vec2 uHotspots[5] (fixed compile-time size).
 * We always normalise to exactly 5 slots: truncate if more, pad [0,0] if fewer.
 * The effect re-creates the mesh whenever hotspots change.
 *
 * Key design:
 *  - NormalBlending (not Additive) → blue color is VISIBLE on brown land
 *  - Higher alpha (0.55–0.75 range) → unmissable
 *  - Bright electric blue (#0080FF range) not dark navy
 *  - No land mask dependency (too many failure modes) — just proximity blobs
 *  - Sine wave interference creates animated water surface
 *
 * Radius : 100.62  (just above Earth surface 100.0)
 * Fade   : 1200ms in, 600ms out
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const RADIUS      = 100.62
const FADE_IN_MS  = 1200
const FADE_OUT_MS = 600
const SHADER_SLOTS = 5   // GLSL compile-time constant

const VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv    = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uOpacity;
  uniform vec2  uHotspots[5];

  varying vec2 vUv;
  varying vec3 vNormal;

  // Value noise
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.y*u.x;
  }

  void main() {
    float lat    = (0.5 - vUv.y) * 180.0;
    float lng    = (vUv.x - 0.5) * 360.0;
    float cosLat = cos(radians(lat));

    // ── Proximity weight: sum of Gaussian blobs at each hotspot ────────────
    float weight = 0.0;
    for (int i = 0; i < 5; i++) {
      float dLat = lat - uHotspots[i].x;
      float dLng = (lng - uHotspots[i].y) * cosLat;
      float d2   = dLat * dLat + dLng * dLng;
      weight += exp(-d2 / 128.0);   // sigma ≈ 8°  ~900 km radius
    }
    weight = clamp(weight, 0.0, 1.0);
    if (weight < 0.015) discard;

    // ── Animated water surface: 6-way sine interference ────────────────────
    float t = uTime;
    float w1 = sin(lat*0.40 + lng*0.25 + t*1.80) * 0.5 + 0.5;
    float w2 = sin(lat*0.28 - lng*0.50 + t*2.10) * 0.5 + 0.5;
    float w3 = sin(lat*0.55 + lng*0.18 - t*1.55) * 0.5 + 0.5;
    float w4 = sin(lat*0.18 + lng*0.65 + t*2.40) * 0.5 + 0.5;
    float w5 = cos(lat*0.45 - lng*0.35 - t*1.70) * 0.5 + 0.5;
    float waves = (w1*0.25 + w2*0.22 + w3*0.20 + w4*0.18 + w5*0.15);

    // Fine-grain surface ripple
    float ripple = noise(vec2(lng*0.4 + t*0.3, lat*0.4 + t*0.2)) * 0.12;
    waves = clamp(waves + ripple, 0.0, 1.0);

    // ── Rising water level animation ───────────────────────────────────────
    float rise  = smoothstep(0.0, 6.0, t);          // 0→1 over 6 seconds
    float pulse = 0.90 + 0.10 * sin(t * 0.75);      // gentle breathing after rise

    // ── Colour gradient: deep blue → vivid cyan → bright white foam ────────
    //   (all colours are bright enough to show clearly on brown/green land)
    vec3 deepBlue  = vec3(0.02, 0.35, 0.92);   // vivid cobalt
    vec3 midCyan   = vec3(0.10, 0.65, 1.00);   // electric cyan
    vec3 foamWhite = vec3(0.85, 0.95, 1.00);   // foam crests

    float depth = waves * (0.3 + rise * 0.7) * pulse;
    vec3 color  = mix(deepBlue, midCyan,   smoothstep(0.20, 0.65, depth));
    color       = mix(color,    foamWhite, smoothstep(0.75, 0.95, depth));

    // ── Alpha: strong enough to show clearly, weight controls edge falloff ──
    float alpha = weight * (0.50 + depth * 0.25) * uOpacity;
    if (alpha < 0.008) discard;

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

export default function FloodPulse({ scene, maskTexture, registerAnimated, hotspots = [] }) {
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
      blending:    THREE.NormalBlending,   // ← Normal blend: visible on all surfaces
      side:        THREE.FrontSide,
    })

    const geo  = new THREE.SphereGeometry(RADIUS, 128, 128)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y    = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 4

    // Set identification metadata for click handler
    mesh.userData = {
      floodType: 'pulse',
      name: 'Vivid Inundation Overlay'
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
