/**
 * StormLayer/RainBands.jsx
 *
 * Simulates tropical storm rain bands — spiraling curtains of heavy rain
 * that rotate around each storm's center.
 *
 * Uses a GPU particle system where:
 *   - 800 rain particles per storm fall radially inward (from top of atmosphere)
 *   - Particles are distributed in spiral band arcs (not uniform)
 *   - They fall from radius 102.0 → 100.0 in repeating cycles
 *   - Color: deep blue-teal
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const MAX_R = 102.0
const MIN_R = 100.0
const PER_STORM = 800
const FADE_MS = 1000

const VERT = /* glsl */`
  attribute float aLat;
  attribute float aLng;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aBandAngle; // which rain band arc this particle belongs to

  uniform float uTime;
  uniform float uOpacity;
  uniform float uRotDir; // +1 NH, -1 SH

  varying float vAlpha;

  void main() {
    // Falling phase [0, 1)
    float phase = mod(uTime * aSpeed + aPhase, 1.0);
    float r     = mix(${MAX_R.toFixed(2)}, ${MIN_R.toFixed(2)}, phase);

    float phi   = (90.0 - aLat) * 3.14159 / 180.0;
    float theta = (90.0 - aLng) * 3.14159 / 180.0;

    vec3 pos    = vec3(r * sin(phi)*cos(theta), r * cos(phi), r * sin(phi)*sin(theta));
    vec3 rotPos = vec3(-pos.z, pos.y, pos.x);

    gl_Position  = projectionMatrix * modelViewMatrix * vec4(rotPos, 1.0);
    gl_PointSize = mix(10.0, 3.0, phase); // large at top, small at impact

    float fadeIn  = smoothstep(0.0, 0.08, phase);
    float fadeOut = 1.0 - smoothstep(0.88, 1.0, phase);
    vAlpha = fadeIn * fadeOut * uOpacity * 0.65;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    // Thin vertical streak
    if (abs(c.x) > 0.10) discard;
    float fade = 1.0 - (c.y + 0.5);
    vec3  col  = vec3(0.20, 0.55, 0.90);
    gl_FragColor = vec4(col, fade * vAlpha);
  }
`

export default function RainBands({ scene, storm, registerAnimated }) {
  useEffect(() => {
    const count = PER_STORM
    const lats   = new Float32Array(count)
    const lngs   = new Float32Array(count)
    const phases = new Float32Array(count)
    const speeds = new Float32Array(count)
    const bandAs = new Float32Array(count)

    // 5 spiral rain bands
    const NUM_BANDS = 5
    const rotDir = storm.lat >= 0 ? -1 : 1

    for (let i = 0; i < count; i++) {
      const bandIdx   = i % NUM_BANDS
      const bandPhase = (bandIdx / NUM_BANDS) * Math.PI * 2
      // Random position along the band arc
      const r        = 0.25 + Math.random() * 0.72
      const angle    = bandPhase + r * Math.PI * 1.5 * rotDir + Math.random() * 0.4
      const latScale = storm.radius * 0.90
      const lngScale = storm.radius * 0.90 / Math.max(0.1, Math.cos(storm.lat * Math.PI / 180))

      lats[i]   = storm.lat + r * latScale * Math.sin(angle)
      lngs[i]   = storm.lng + r * lngScale * Math.cos(angle)
      phases[i] = Math.random()
      speeds[i] = 0.30 + Math.random() * 0.25
      bandAs[i] = bandPhase
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',   new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aLat',       new THREE.BufferAttribute(lats, 1))
    geo.setAttribute('aLng',       new THREE.BufferAttribute(lngs, 1))
    geo.setAttribute('aPhase',     new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aSpeed',     new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aBandAngle', new THREE.BufferAttribute(bandAs, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },
        uRotDir:  { value: rotDir },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    pts.renderOrder   = 19
    pts.userData = {
      stormType: 'rainband',
      stormId:   storm.id,
      name:      `${storm.name} — Rain Bands`,
      desc:      'Spiral rain bands that rotate around the storm center. These outer bands can extend 300–500 miles from the eye, bringing tornadoes, storm surge, and intense rainfall to coastal regions.',
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
        mat.uniforms.uOpacity.value -= 0.04
        if (mat.uniforms.uOpacity.value > 0) requestAnimationFrame(fade)
        else { scene.remove(pts); geo.dispose(); mat.dispose() }
      }
      fade()
    }
  }, [scene, storm]) // eslint-disable-line

  return null
}
