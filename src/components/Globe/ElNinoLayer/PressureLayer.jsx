/**
 * PressureLayer.jsx — Barometric Pressure Pulsing Overlays.
 *
 * Renders two pulsing pressure zones:
 *   - LOW pressure (blue, deep-breath pulsing) over the WARM water pool
 *   - HIGH pressure (orange, tight rapid pulsing) over the COLD side
 *
 * Normal:  LOW=Indonesia (warm), HIGH=Peru (cold)
 * El Niño: LOW shifts to Central/East Pacific, HIGH shifts to Indonesia
 *
 * Technique: SphereGeometry patches (caps) with shader pulse rings.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const RADIUS     = 103.5
const FADE_IN_MS = 1000
const FADE_OUT_MS = 600

// Pressure zone config
const ZONES = [
  {
    id: 'low',
    label: 'LOW',
    // Normal center (Indonesia): lat 0, lng 130
    normalLat: 0, normalLng: 130,
    // El Niño center (Central Pacific): lat 0, lng -120
    ninoLat:   0, ninoLng: -120,
    color: new THREE.Color(0.12, 0.38, 1.0),    // blue
    pulseFreq: 0.55,
  },
  {
    id: 'high',
    label: 'HIGH',
    // Normal center (Peru coast): lat -8, lng -82
    normalLat: -8, normalLng: -82,
    // El Niño center (Indonesia): lat 0, lng 128
    ninoLat:   0, ninoLng: 128,
    color: new THREE.Color(1.0, 0.48, 0.05),    // orange
    pulseFreq: 1.10,
  },
]

const VERT = /* glsl */`
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3  uColor;
  uniform float uPulseFreq;
  uniform vec3  uCenter;   // 3D world-space direction of the center

  varying vec3 vNormal;

  void main() {
    // Angular distance from this fragment's normal to the zone center
    float d = acos(clamp(dot(normalize(vNormal), normalize(uCenter)), -1.0, 1.0));
    float maxAngle = 0.50; // ~28.6 degrees radius

    if (d > maxAngle) discard;

    float normD = d / maxAngle;

    // Pulsing concentric rings
    float wave = sin((normD - uTime * uPulseFreq) * 16.0) * 0.5 + 0.5;
    wave = pow(wave, 3.0);

    // Core glow at center
    float core = smoothstep(0.38, 0.0, normD);

    // Edge falloff
    float edge = smoothstep(1.0, 0.60, normD);

    float alpha = (core * 0.55 + wave * 0.35) * edge * uOpacity;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`

function latLngToDir(lat, lng) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (90 - lng) * Math.PI / 180
  // Rotated by globe's Y = -PI/2
  const x = Math.sin(phi) * Math.cos(theta)
  const y = Math.cos(phi)
  const z = Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(-z, y, x)
}

export default function PressureLayer({ scene, registerAnimated }) {
  useEffect(() => {
    const meshes = []

    ZONES.forEach((zone) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTime:      { value: 0.0 },
          uOpacity:   { value: 0.0 },
          uColor:     { value: zone.color },
          uPulseFreq: { value: zone.pulseFreq },
          uCenter:    { value: latLngToDir(zone.normalLat, zone.normalLng) },
        },
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        side:        THREE.FrontSide,
      })

      const geo  = new THREE.SphereGeometry(RADIUS, 72, 36)
      const mesh = new THREE.Mesh(geo, material)
      mesh.rotation.y    = -Math.PI / 2
      mesh.frustumCulled = false
      mesh.renderOrder   = 16

      mesh.userData = {
        ensoType: zone.id === 'low' ? 'pressure-low' : 'pressure-high',
        name:     zone.id === 'low' ? 'Low Pressure System (Warm Pool)' : 'High Pressure System (Cold Ocean)',
        desc:     zone.id === 'low'
          ? 'Warm air rises over the heated ocean, creating a low-pressure zone. During El Niño, this low-pressure centre migrates eastward, pulling storm systems away from Indonesia.'
          : 'Cool, dry air descends over the cold ocean, creating a high-pressure zone. During El Niño, high pressure moves to the Western Pacific, suppressing rainfall over Australia and Southeast Asia.',
        _zone: zone,
        _mat: material,
      }

      scene.add(mesh)
      meshes.push({ mesh, material, zone })
    })

    const startMs = performance.now()

    const unregister = registerAnimated((ensoTime) => {
      const elapsed = performance.now() - startMs
      const opacity = Math.min(elapsed / FADE_IN_MS, 1.0)

      // El Nino progress [0, 1]
      let ninoFrac = 0.0
      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        ninoFrac = (ensoTime - 4.0) / 6.0
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        ninoFrac = 1.0
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        ninoFrac = 1.0 - (ensoTime - 18.0) / 6.0
      }
      const eased = THREE.MathUtils.smoothstep(ninoFrac, 0, 1)

      meshes.forEach(({ material, zone }) => {
        material.uniforms.uTime.value    = ensoTime
        material.uniforms.uOpacity.value = opacity

        // Interpolate center direction between Normal and El Niño positions
        const normalDir = latLngToDir(zone.normalLat, zone.normalLng)
        const ninoDir   = latLngToDir(zone.ninoLat,   zone.ninoLng)
        const center    = normalDir.clone().lerp(ninoDir, eased).normalize()
        material.uniforms.uCenter.value = center
      })
    })

    return () => {
      unregister()
      const fadeStart = performance.now()
      const cleanup = () => {
        const p = (performance.now() - fadeStart) / FADE_OUT_MS
        if (p < 1.0) {
          meshes.forEach(({ material }) => {
            material.uniforms.uOpacity.value = Math.max(0, 1.0 - p)
          })
          requestAnimationFrame(cleanup)
        } else {
          meshes.forEach(({ mesh, material, zone }) => {
            scene.remove(mesh)
            mesh.geometry.dispose()
            material.dispose()
          })
        }
      }
      requestAnimationFrame(cleanup)
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
