/**
 * AirPollutionLayer/SootDrift.jsx
 *
 * Simulates micro-particulate (PM2.5) soot and dust drifting eastward
 * due to atmospheric winds.
 *
 * Coordinates are mapped 100% correctly using globe.getCoords and tangent plane vectors
 * to prevent any rotation/hemisphere offsets.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const MIN_R = 100.8
const MAX_R = 102.3
const EMITTER_COUNT = 300
const FADE_MS = 1000

const VERT = /* glsl */`
  attribute float aLatOffset;
  attribute float aLngOffset;
  attribute float aBirthPhase;
  attribute float aSpeed;
  attribute float aSize;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uAqi;

  // Tangent plane basis uniforms
  uniform vec3 uCenter;
  uniform vec3 uRight;
  uniform vec3 uFwd;
  uniform vec3 uUp;

  varying float vAlpha;

  void main() {
    // Progression of particle life [0, 1)
    float phase = mod(uTime * aSpeed + aBirthPhase, 1.0);

    // Altitude rise above the surface
    float rOffset = (mix(${MIN_R.toFixed(2)}, ${MAX_R.toFixed(2)}, phase) - 100.8);

    // Drift trajectory (eastward wind carrying particulates)
    // Drift distance scales with phase.
    float driftLng = phase * 7.5; // drift 7.5 degrees east
    float driftLat = phase * (aLatOffset * 0.4); // slight dispersion

    // 1 degree on Earth is approx 1.745 units (radius 100)
    float unitPerDegree = 1.745;
    float localRight = (aLngOffset + driftLng) * unitPerDegree;
    float localFwd   = (aLatOffset + driftLat) * unitPerDegree;

    // Displace center along basis vectors
    vec3 pos = uCenter + localRight * uRight + localFwd * uFwd + rOffset * uUp;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    // Particle sizes (larger as they expand/disperse)
    gl_PointSize = aSize * mix(1.2, 3.4, phase);

    // Fade-in at emission, fade-out at dispersion limit
    float fadeIn = smoothstep(0.0, 0.12, phase);
    float fadeOut = 1.0 - smoothstep(0.70, 1.0, phase);

    // Base alpha scales with AQI
    float aqiFrac = clamp(uAqi / 350.0, 0.30, 1.0);
    vAlpha = fadeIn * fadeOut * aqiFrac * uOpacity * 0.75;
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
    // Dark carbon black soot/ash particle color (rendered as visible dark ash-grey)
    vec3 color = vec3(0.18, 0.17, 0.19);

    gl_FragColor = vec4(color, glow * vAlpha);
  }
`

export default function SootDrift({ globe, scene, hotspot, liveAqi, registerAnimated }) {
  useEffect(() => {
    if (!globe) return

    const count = EMITTER_COUNT
    const latOffsets  = new Float32Array(count)
    const lngOffsets  = new Float32Array(count)
    const birthPhases = new Float32Array(count)
    const speeds      = new Float32Array(count)
    const sizes       = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Concentrated at the center cone
      const r = Math.pow(Math.random(), 1.5) * 1.5 // dense at core
      const angle = Math.random() * Math.PI * 2
      latOffsets[i]  = r * Math.sin(angle)
      lngOffsets[i]  = r * Math.cos(angle)
      birthPhases[i] = Math.random()
      speeds[i]      = 0.18 + Math.random() * 0.16
      sizes[i]       = 2.2 + Math.random() * 3.8
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aLatOffset',  new THREE.BufferAttribute(latOffsets, 1))
    geo.setAttribute('aLngOffset',  new THREE.BufferAttribute(lngOffsets, 1))
    geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(birthPhases, 1))
    geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aSize',       new THREE.BufferAttribute(sizes, 1))

    const aqi = liveAqi?.aqi ?? hotspot.baseAqi

    // Position and tangent basis vectors using globe.getCoords
    const coords = globe.getCoords(hotspot.lat, hotspot.lng)
    const center = new THREE.Vector3(coords.x, coords.y, coords.z)
    const up        = center.clone().normalize()
    const arbitrary = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right     = up.clone().cross(arbitrary).normalize()
    const fwd       = up.clone().cross(right).normalize()

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:     { value: 0 },
        uOpacity:  { value: 0 },
        uAqi:      { value: aqi },
        uCenter:   { value: center },
        uRight:    { value: right },
        uFwd:      { value: fwd },
        uUp:       { value: up },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
    })

    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    points.renderOrder   = 24
    points.userData = {
      pollutionType: 'drift',
      hotspotId:     hotspot.id,
      name:          `${hotspot.name} PM2.5 Dispersion`,
      desc:          `Microscopic fine particles (diameter < 2.5 micrometers) suspended in air currents. Wind carries this particulate plume downwind, posing respiratory health risks for thousands of square kilometers.`,
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
  }, [globe, scene, hotspot, liveAqi]) // eslint-disable-line

  return null
}
