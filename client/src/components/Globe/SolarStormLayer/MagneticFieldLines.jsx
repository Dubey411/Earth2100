/**
 * SolarStormLayer/MagneticFieldLines.jsx
 *
 * Renders THICK, GLOWING magnetic field lines (dipole lines) looping from
 * South Pole to North Pole.
 *
 * Dynamics:
 *   - The field lines are dynamically distorted to match the magnetosphere:
 *     compressed on the sun-facing side (+X/+Y), stretched on the tail side (-X/-Y).
 *   - Uses TubeGeometry for 3D visual thickness.
 *   - Custom ShaderMaterial animates glowing packets of energy (pulses)
 *     flowing along the field lines from South to North.
 */
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

const EARTH_R = 100.0
const FADE_MS = 800

// ── Shader for glowing lines ──────────────────────────────────────────────
const VERT = /* glsl */`
  attribute float aT;
  varying float vT;
  varying vec3 vPosition;
  void main() {
    vT = aT;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIntensity;

  varying float vT;
  varying vec3 vPosition;

  void main() {
    // ── 3 moving pulses along the line ─────────────────────────────────────
    float speed = 1.2;
    float pulse1 = smoothstep(0.15, 0.0, abs(fract(vT * 2.0 - uTime * speed) - 0.5));
    float pulse2 = smoothstep(0.15, 0.0, abs(fract(vT * 2.0 - uTime * speed + 0.5) - 0.5));
    float pulse = max(pulse1, pulse2);

    // ── Color: bright cyan/blue with white pulses ──────────────────────────
    vec3 baseColor = vec3(0.15, 0.55, 0.95);  // Bright blue
    vec3 pulseColor = vec3(0.80, 0.95, 1.0);  // White-cyan
    vec3 finalColor = mix(baseColor, pulseColor, pulse * 0.8);

    // ── Brightness boost ──────────────────────────────────────────────────
    float brightness = 0.5 + 0.5 * uIntensity;

    // ── Fade at poles ──────────────────────────────────────────────────────
    float poleFade = smoothstep(0.0, 0.12, vT) * (1.0 - smoothstep(0.88, 1.0, vT));

    // ── Alpha: HIGHER visibility ──────────────────────────────────────────
    float alpha = (0.20 + pulse * 0.50) * poleFade * uOpacity * brightness;

    if (alpha < 0.01) discard;

    gl_FragColor = vec4(finalColor * brightness, alpha);
  }
`

// ── Generate dipole field line points ──────────────────────────────────────
function generateFieldLine(angleY, maxDist, intensity) {
  const points = []
  const steps = 50
  
  // Solar wind direction (compression side)
  const windDir = new THREE.Vector3(1.0, 0.5, 0.5).normalize()

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const theta = t * Math.PI

    const sinTheta = Math.sin(theta)
    const r = EARTH_R + (maxDist - 1.0) * EARTH_R * sinTheta * sinTheta

    // Local position in loop plane
    const localX = r * sinTheta
    const localY = -r * Math.cos(theta)

    // Rotate around Y
    const x = localX * Math.cos(angleY)
    const y = localY
    const z = localX * Math.sin(angleY)

    const pos = new THREE.Vector3(x, y, z)
    const dir = pos.clone().normalize()
    const alignment = dir.dot(windDir)

    // Apply distortion (compression on sun side, stretch on tail)
    if (alignment > 0.0) {
      const compression = 1.0 - 0.28 * alignment * (0.85 + intensity * 0.15)
      pos.multiplyScalar(compression)
    } else {
      const extension = 1.0 - 0.45 * alignment
      pos.multiplyScalar(extension)
    }

    points.push(pos)
  }
  return points
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MagneticFieldLines({ scene, globalTime, intensity = 1.0, registerAnimated }) {
  const groupRef = useRef(null)

  useEffect(() => {
    const group = new THREE.Group()
    group.renderOrder = 26
    scene.add(group)
    groupRef.current = group

    // ── Shared material ──────────────────────────────────────────────────────
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:      { value: 0 },
        uOpacity:   { value: 0 },
        uIntensity: { value: intensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const numLoops = 12
    const distances = [1.25, 1.55, 1.90] // Field line radii (Earth multiples)
    const geometriesToDispose = []

    for (let i = 0; i < numLoops; i++) {
      const angleY = (i / numLoops) * Math.PI * 2

      distances.forEach((maxDist) => {
        const points = generateFieldLine(angleY, maxDist, intensity)

        // ── Convert to TubeGeometry (THICK lines) ──────────────────────────
        const curve = new THREE.CatmullRomCurve3(points)
        const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.35, 8, false)
        
        // ── Transfer aT attribute for shader ──────────────────────────────
        const count = tubeGeo.attributes.position.count
        const aTAttr = new Float32Array(count)
        for (let j = 0; j < count; j++) {
          // Approximate position along curve based on vertex position
          const yPos = tubeGeo.attributes.position.getY(j)
          aTAttr[j] = (yPos + 150) / 300 // Normalize roughly
        }
        tubeGeo.setAttribute('aT', new THREE.BufferAttribute(aTAttr, 1))

        const line = new THREE.Mesh(tubeGeo, mat)
        group.add(line)
        geometriesToDispose.push(tubeGeo)
      })
    }

    // ── Fade in ──────────────────────────────────────────────────────────────
    const startMs = performance.now()
    const unregister = registerAnimated((t) => {
      const elapsed = (performance.now() - startMs) / FADE_MS
      mat.uniforms.uOpacity.value = Math.min(elapsed, 1.0)
      mat.uniforms.uIntensity.value = intensity
      mat.uniforms.uTime.value = t
    })

    return () => {
      unregister()
      // ── Fade out ──────────────────────────────────────────────────────────
      const fade = () => {
        mat.uniforms.uOpacity.value -= 0.05
        if (mat.uniforms.uOpacity.value > 0) {
          requestAnimationFrame(fade)
        } else {
          scene.remove(group)
          geometriesToDispose.forEach(g => g.dispose())
          mat.dispose()
        }
      }
      fade()
    }
  }, [scene, intensity])

  return null
}