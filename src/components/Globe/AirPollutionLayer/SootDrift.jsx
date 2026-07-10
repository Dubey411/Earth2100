/**
 * AirPollutionLayer/SootDrift.jsx
 * 
 * FIXED: Correct particle position, better visibility
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const MIN_R = 100.8
const MAX_R = 102.3
const EMITTER_COUNT = 150
const FADE_MS = 1000

const VERT = /* glsl */`
  attribute float aLatOffset;
  attribute float aLngOffset;
  attribute float aBirthPhase;
  attribute float aSpeed;
  attribute float aSize;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uBaseLat;
  uniform float uBaseLng;
  uniform float uAqi;

  varying float vAlpha;

  void main() {
    float phase = mod(uTime * aSpeed + aBirthPhase, 1.0);
    float r = mix(${MIN_R.toFixed(2)}, ${MAX_R.toFixed(2)}, phase);
    float driftLng = phase * 7.5;
    float driftLat = phase * (aLatOffset * 0.4);

    float lat = uBaseLat + aLatOffset + driftLat;
    float lng = uBaseLng + aLngOffset + driftLng;

    float phi   = (90.0 - lat) * 3.14159 / 180.0;
    float theta = (90.0 - lng) * 3.14159 / 180.0;

    vec3 pos = vec3(
      r * sin(phi) * cos(theta),
      r * cos(phi),
      r * sin(phi) * sin(theta)
    );

    // ✅ FIXED: Correct rotation for globe Y = -PI/2
    vec3 rotatedPos = vec3(-pos.z, pos.y, pos.x);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(rotatedPos, 1.0);
    gl_PointSize = aSize * mix(1.2, 3.4, phase);

    float fadeIn = smoothstep(0.0, 0.12, phase);
    float fadeOut = 1.0 - smoothstep(0.70, 1.0, phase);
    float aqiFrac = clamp(uAqi / 350.0, 0.30, 1.0);
    vAlpha = fadeIn * fadeOut * aqiFrac * uOpacity * 0.85;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    if (dist > 0.5) discard;

    float glow = smoothstep(0.5, 0.10, dist);
    vec3 color = vec3(0.02, 0.02, 0.03);
    gl_FragColor = vec4(color, glow * vAlpha);
  }
`

export default function SootDrift({ scene, hotspot, liveAqi, registerAnimated }) {
  useEffect(() => {
    const count = EMITTER_COUNT
    const latOffsets  = new Float32Array(count)
    const lngOffsets  = new Float32Array(count)
    const birthPhases = new Float32Array(count)
    const speeds      = new Float32Array(count)
    const sizes       = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.5) * 1.5
      const angle = Math.random() * Math.PI * 2
      latOffsets[i]  = r * Math.sin(angle)
      lngOffsets[i]  = r * Math.cos(angle)
      birthPhases[i] = Math.random()
      speeds[i]      = 0.18 + Math.random() * 0.16
      sizes[i]       = 1.5 + Math.random() * 2.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aLatOffset',  new THREE.BufferAttribute(latOffsets, 1))
    geo.setAttribute('aLngOffset',  new THREE.BufferAttribute(lngOffsets, 1))
    geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(birthPhases, 1))
    geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aSize',       new THREE.BufferAttribute(sizes, 1))

    const aqi = liveAqi?.aqi ?? hotspot.baseAqi

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:     { value: 0 },
        uOpacity:  { value: 0 },
        uBaseLat:  { value: hotspot.lat },
        uBaseLng:  { value: hotspot.lng },
        uAqi:      { value: aqi },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    points.renderOrder   = 16 // Lower render order

    points.userData = {
      pollutionType: 'drift',
      hotspotId:     hotspot.id,
      name:          `${hotspot.name} PM2.5 Dispersion`,
      desc:          `Microscopic fine particles suspended in air currents.`,
    }

    scene.add(points)

    const startMs = performance.now()
    const unregister = registerAnimated((t) => {
      const elapsed = (performance.now() - startMs) / FADE_MS
      mat.uniforms.uOpacity.value = Math.min(elapsed, 1.0)
      mat.uniforms.uTime.value    = t
    })

    return () => {
      unregister()
      const fade = () => {
        mat.uniforms.uOpacity.value -= 0.05
        if (mat.uniforms.uOpacity.value > 0) requestAnimationFrame(fade)
        else { scene.remove(points); geo.dispose(); mat.dispose() }
      }
      fade()
    }
  }, [scene, hotspot, liveAqi])

  return null
}