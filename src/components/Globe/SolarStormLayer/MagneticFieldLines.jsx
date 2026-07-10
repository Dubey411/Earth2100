/**
 * SolarStormLayer/MagneticFieldLines.jsx
 *
 * Renders 3D magnetic field lines (dipole lines) looping from the South Pole
 * to the North Pole.
 *
 * Dynamics:
 *   - The field lines are dynamically distorted to match the magnetosphere:
 *     compressed on the sun-facing side (+X/+Y), stretched on the tail side (-X/-Y).
 *   - Uses a custom ShaderMaterial to animate glowing packets of energy (pulses)
 *     flowing along the field lines from South to North.
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const EARTH_R = 100.0
const FADE_MS = 1200

// Shaders for the line segments
const VERT = /* glsl */`
  attribute float aT; // normalized distance along the curve [0..1]
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIntensity;

  varying float vT;

  void main() {
    // Flowing dash pulse from South (vT=0) to North (vT=1)
    // 3 pulses along the line, moving at speed 1.8
    float speed = 1.8;
    float pulse = smoothstep(0.18, 0.0, abs(fract(vT * 3.0 - uTime * speed) - 0.5));

    // Base color: pale cyan/blue
    vec3 baseColor = vec3(0.20, 0.65, 1.0);
    // Pulse color: glowing white/light cyan
    vec3 pulseColor = vec3(0.70, 0.95, 1.0);

    vec3 finalColor = mix(baseColor, pulseColor, pulse * 0.70);

    // Alpha: fade out near the poles to blend cleanly, and scale with uOpacity/uIntensity
    float edgeFade = smoothstep(0.0, 0.15, vT) * (1.0 - smoothstep(0.85, 1.0, vT));
    float alpha = (0.15 + pulse * 0.35) * edgeFade * uOpacity * (0.6 + uIntensity * 0.4);

    if (alpha < 0.005) discard;

    gl_FragColor = vec4(finalColor, alpha);
  }
`

/**
 * Generates a single dipole loop curve from South Pole to North Pole,
 * distorted by the solar wind alignment.
 */
function generateFieldLine(angleY, maxDist, intensity) {
  const points = []
  const steps = 60
  const windDir = new THREE.Vector3(1.0, 0.6, 0.6).normalize()

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // Angle from South Pole (0) to North Pole (PI)
    const theta = t * Math.PI

    // Dipole equation: r = R_earth * maxDist * sin(theta)
    // South/North poles are at theta = 0, PI (r = 0, but offset to Earth radius)
    const sinTheta = Math.sin(theta)
    const r = EARTH_R + (maxDist - 1.0) * EARTH_R * sinTheta * sinTheta

    // Local 3D point in the loop plane (Z-up orientation for curve math)
    const localX = r * sinTheta
    const localY = -r * Math.cos(theta)

    // Rotate loop around the Y-axis
    const x = localX * Math.cos(angleY)
    const y = localY
    const z = localX * Math.sin(angleY)

    const pos = new THREE.Vector3(x, y, z)
    const dir = pos.clone().normalize()
    const alignment = dir.dot(windDir)

    // Apply the exact same distortion as the Magnetosphere
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

export default function MagneticFieldLines({ scene, globalTime, intensity = 1.0, registerAnimated }) {
  const groupRef = useRef(null)

  useEffect(() => {
    const group = new THREE.Group()
    group.renderOrder = 26
    scene.add(group)
    groupRef.current = group

    // Shared ShaderMaterial for all field lines
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:      { value: 0 },
        uOpacity:   { value: 0 },
        uIntensity: { value: intensity },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    // Generate 12 loops rotated around the Y-axis
    const numLoops = 12
    // For each loop, draw 3 concentric field lines of increasing size
    const distances = [1.18, 1.45, 1.75]

    const geometriesToDispose = []

    for (let i = 0; i < numLoops; i++) {
      const angleY = (i / numLoops) * Math.PI * 2

      distances.forEach((maxDist) => {
        const points = generateFieldLine(angleY, maxDist, intensity)

        // Convert points to buffer attributes for custom shader mapping (aT)
        const count = points.length
        const vertices = new Float32Array(count * 3)
        const aTAttr   = new Float32Array(count)

        for (let j = 0; j < count; j++) {
          vertices[j * 3]     = points[j].x
          vertices[j * 3 + 1] = points[j].y
          vertices[j * 3 + 2] = points[j].z
          aTAttr[j]           = j / (count - 1)
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
        geo.setAttribute('aT',       new THREE.BufferAttribute(aTAttr, 1))

        const line = new THREE.Line(geo, mat)
        group.add(line)
        geometriesToDispose.push(geo)
      })
    }

    const startMs = performance.now()
    const unregister = registerAnimated((t) => {
      const elapsed = (performance.now() - startMs) / FADE_MS
      mat.uniforms.uOpacity.value   = Math.min(elapsed, 1.0)
      mat.uniforms.uIntensity.value = intensity
      mat.uniforms.uTime.value      = t
    })

    return () => {
      unregister()
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
  }, [scene, intensity]) // eslint-disable-line

  return null
}
