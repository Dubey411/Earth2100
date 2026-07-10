/**
 * StormLayer/LightningBolts.jsx
 *
 * GPU-instanced lightning strike particles inside storm clouds.
 *
 * Each storm gets 40 bolts. Each bolt:
 *   - Randomly flashes on/off (high-frequency random strobe)
 *   - Spawned at a random position within the storm radius
 *   - Bright white/blue-white color with bloom-like glow
 *   - Rendered as a short vertical streak (elongated point)
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const GLOBE_R = 101.2   // slightly above vortex
const BOLTS_PER_STORM = 40
const FADE_MS = 800

const VERT = /* glsl */`
  attribute float aLat;
  attribute float aLng;
  attribute float aSeed;   // unique random per bolt
  attribute float aPhase;  // birth offset

  uniform float uTime;
  uniform float uOpacity;

  varying float vAlpha;

  // Simple hash to get pseudo-random bolt visibility
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5); }

  void main() {
    // Fast flicker: each bolt has a unique flash frequency 4–10 Hz
    float freq    = 4.0 + hash(aSeed * 13.7) * 6.0;
    float raw     = sin(uTime * freq * 6.283 + aPhase);
    float visible = step(0.80, raw); // only show at peak of flash

    float phi   = (90.0 - aLat) * 3.14159 / 180.0;
    float theta = (90.0 - aLng) * 3.14159 / 180.0;
    float r     = ${GLOBE_R.toFixed(2)};

    vec3 pos = vec3(r * sin(phi)*cos(theta), r * cos(phi), r * sin(phi)*sin(theta));
    vec3 rot = vec3(-pos.z, pos.y, pos.x); // globe Y rot

    gl_Position  = projectionMatrix * modelViewMatrix * vec4(rot, 1.0);
    gl_PointSize = mix(4.0, 12.0, hash(aSeed * 7.3)) * visible;

    vAlpha = visible * uOpacity;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;

  void main() {
    vec2  c = gl_PointCoord - 0.5;
    // Elongated vertical streak shape
    float d = length(vec2(c.x * 4.0, c.y));
    if (d > 0.5) discard;
    float g = smoothstep(0.5, 0.05, d);
    vec3 col = vec3(0.85, 0.92, 1.0); // blue-white lightning
    gl_FragColor = vec4(col, g * vAlpha);
  }
`

export default function LightningBolts({ scene, storm, registerAnimated }) {
  useEffect(() => {
    const count  = BOLTS_PER_STORM
    const lats   = new Float32Array(count)
    const lngs   = new Float32Array(count)
    const seeds  = new Float32Array(count)
    const phases = new Float32Array(count)

    const latScale = storm.radius * 0.85
    const lngScale = storm.radius * 0.85 / Math.max(0.1, Math.cos(storm.lat * Math.PI / 180))

    for (let i = 0; i < count; i++) {
      // Bolts in the annular storm region (not the eye)
      const r     = 0.20 + Math.random() * 0.75
      const angle = Math.random() * Math.PI * 2
      lats[i]   = storm.lat + r * latScale * Math.sin(angle)
      lngs[i]   = storm.lng + r * lngScale * Math.cos(angle)
      seeds[i]  = Math.random()
      phases[i] = Math.random() * Math.PI * 2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aLat',     new THREE.BufferAttribute(lats, 1))
    geo.setAttribute('aLng',     new THREE.BufferAttribute(lngs, 1))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    pts.renderOrder   = 22
    pts.userData = {
      stormType: 'lightning',
      stormId:   storm.id,
      name:      `${storm.name} — Electrical Activity`,
      desc:      'Intense lightning within the cyclone\'s rainbands. Super-cooled updrafts create enormous charge separation, generating thousands of strikes per hour in Category 4–5 storms.',
    }

    scene.add(pts)

    const startMs = performance.now()
    const unregister = registerAnimated((t) => {
      const elapsed = (performance.now() - startMs) / FADE_MS
      mat.uniforms.uOpacity.value = Math.min(elapsed, 1.0) * storm.intensity
      mat.uniforms.uTime.value    = t
    })

    return () => {
      unregister()
      const fade = () => {
        mat.uniforms.uOpacity.value -= 0.06
        if (mat.uniforms.uOpacity.value > 0) requestAnimationFrame(fade)
        else { scene.remove(pts); geo.dispose(); mat.dispose() }
      }
      fade()
    }
  }, [scene, storm]) // eslint-disable-line

  return null
}
