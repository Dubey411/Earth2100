/**
 * FloodOverlay.jsx — Semi-transparent water accumulation overlay over 8 flood
 * regions. A Gaussian blob is rendered at each region centre, masked to land only.
 *
 * Radius : 100.65 (just above Earth, below RainParticles / Ripples)
 * Blend  : Additive (luminous blue glow)
 * Fade   : 1200ms in, 600ms out
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { FLOOD_REGIONS } from './constants'

const OVERLAY_RADIUS = 100.65
const FADE_IN_MS     = 1200
const FADE_OUT_MS    = 600

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

  uniform float     uTime;
  uniform float     uOpacity;
  uniform vec2      uRegions[8];   // (lat, lng) per region
  uniform sampler2D uMaskTex;      // land mask: R=1 land, R=0 ocean

  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    // ── Land mask: ocean pixels discarded ──────────────────────────────────
    float isLand = texture2D(uMaskTex, vUv).r;
    if (isLand < 0.5) discard;

    float lat    = (0.5 - vUv.y) * 180.0;
    float lng    = (vUv.x - 0.5) * 360.0;
    float cosLat = cos(radians(lat));

    // ── Sum Gaussian blobs at each flood region ─────────────────────────────
    float accumulation = 0.0;
    for (int i = 0; i < 8; i++) {
      float dLat = lat - uRegions[i].x;
      float dLng = (lng - uRegions[i].y) * cosLat;
      float d2   = dLat * dLat + dLng * dLng;
      float sigma = 7.5;   // degrees → ~830 km
      accumulation += exp(-d2 / (2.0 * sigma * sigma));
    }
    accumulation = clamp(accumulation, 0.0, 1.0);
    if (accumulation < 0.015) discard;

    // ── Slow gentle pulse to simulate water movement ────────────────────────
    float pulse = 0.82 + 0.18 * sin(uTime * 0.85);

    // ── Limb fade ───────────────────────────────────────────────────────────
    float rim     = abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
    float rimFade = smoothstep(0.0, 0.18, rim);

    vec3  color = vec3(0.05, 0.35, 0.92);
    float alpha = accumulation * 0.42 * pulse * uOpacity * rimFade;
    if (alpha < 0.007) discard;

    gl_FragColor = vec4(color, alpha);
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function FloodOverlay({ scene, maskTexture, registerAnimated }) {
  useEffect(() => {
    const regionUniforms = FLOOD_REGIONS.map(([lat, lng]) => new THREE.Vector2(lat, lng))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:    { value: 0.0 },
        uOpacity: { value: 0.0 },
        uRegions: { value: regionUniforms },
        uMaskTex: { value: maskTexture },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.FrontSide,
    })

    const geo  = new THREE.SphereGeometry(OVERLAY_RADIUS, 96, 96)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y    = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 4
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
  }, [scene, maskTexture]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
