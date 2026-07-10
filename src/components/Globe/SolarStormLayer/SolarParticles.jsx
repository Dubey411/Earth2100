/**
 * SolarStormLayer/SolarParticles.jsx
 *
 * GPU-driven solar wind particle stream.
 *
 * Emitter logic:
 *   - Renders 650 particles flowing from top-right space toward the Earth.
 *   - Particles start at a distant source vector (representing the Sun's direction).
 *   - As they approach the Earth, they funnel dynamically toward the polar regions
 *     (North Pole and South Pole) along simulated magnetic field lines.
 *   - Particle color shifts from solar yellow-white to glowing orange-red.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 650
const FADE_MS = 1000

const VERT = /* glsl */`
  attribute float aBirthPhase;
  attribute float aSpeed;
  attribute float aSeed;
  attribute float aSize;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uIntensity;

  varying float vAlpha;
  varying vec3  vColor;

  // Spawning source in space (top-right direction)
  const vec3 uWindSource = vec3(220.0, 150.0, 150.0);
  const vec3 uEarthCenter = vec3(0.0, 0.0, 0.0);
  
  // Polar destination targets (just above Earth surface)
  const vec3 uNorthPole = vec3(0.0, 102.5, 0.0);
  const vec3 uSouthPole = vec3(0.0, -102.5, 0.0);

  float hash(float n) { return fract(sin(n * 123.456) * 43758.5453); }

  void main() {
    // Current life phase of the particle [0, 1)
    float phase = mod(uTime * aSpeed * (0.85 + uIntensity * 0.4) + aBirthPhase, 1.0);

    // Pick target pole based on a random seed (50% North, 50% South)
    bool isNorth = hash(aSeed) > 0.5;
    vec3 targetPole = isNorth ? uNorthPole : uSouthPole;

    // Linear path from source towards Earth boundary (first 75% of travel)
    // Then funnel curves inwards to the poles (remaining 25% of travel)
    vec3 pos;
    if (phase < 0.75) {
      float t = phase / 0.75;
      // Travel from source to a ring around the magnetosphere boundary
      vec3 boundaryPos = vec3(80.0, mix(120.0, -120.0, hash(aSeed * 7.1)), mix(80.0, -80.0, hash(aSeed * 13.9)));
      pos = mix(uWindSource, boundaryPos, t);
    } else {
      float t = (phase - 0.75) / 0.25;
      // Start curving towards the respective pole
      vec3 startCurve = vec3(80.0, mix(120.0, -120.0, hash(aSeed * 7.1)), mix(80.0, -80.0, hash(aSeed * 13.9)));
      
      // Quadratic Bezier path curve: P0 = start, P1 = polar entry, P2 = pole
      vec3 control = vec3(20.0, isNorth ? 140.0 : -140.0, 0.0);
      vec3 p0 = mix(startCurve, control, t);
      vec3 p1 = mix(control, targetPole, t);
      pos = mix(p0, p1, t);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    // Particle sizes (larger as they near the collision zone)
    gl_PointSize = aSize * (1.0 + phase * 0.8) * (0.8 + uIntensity * 0.5);

    // Color gradient: white-yellow in space → deep orange-red as they charge the poles
    vec3 cWhite  = vec3(1.0, 1.0, 0.8);
    vec3 cYellow = vec3(1.0, 0.75, 0.1);
    vec3 cRed    = vec3(1.0, 0.25, 0.0);

    if (phase < 0.6) {
      vColor = mix(cWhite, cYellow, phase / 0.6);
    } else {
      vColor = mix(cYellow, cRed, (phase - 0.6) / 0.4);
    }

    // Alpha logic: fade-in at source, fade-out right before hitting poles
    float fadeIn  = smoothstep(0.0, 0.15, phase);
    float fadeOut = 1.0 - smoothstep(0.92, 1.0, phase);
    vAlpha = fadeIn * fadeOut * uOpacity;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha;
  varying vec3  vColor;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float dist = length(c);
    if (dist > 0.5) discard;

    // Glowing core glow
    float glow = smoothstep(0.5, 0.08, dist);
    gl_FragColor = vec4(vColor, glow * vAlpha);
  }
`

export default function SolarParticles({ scene, globalTime, intensity = 1.0, registerAnimated }) {
  useEffect(() => {
    const count  = PARTICLE_COUNT
    const phases = new Float32Array(count)
    const speeds = new Float32Array(count)
    const seeds  = new Float32Array(count)
    const sizes  = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      phases[i] = Math.random()
      speeds[i] = 0.22 + Math.random() * 0.14
      seeds[i]  = Math.random()
      sizes[i]  = 2.2 + Math.random() * 3.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aBirthPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aSpeed',      new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aSeed',       new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aSize',       new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
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

    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    points.renderOrder   = 29
    scene.add(points)

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
          scene.remove(points)
          geo.dispose()
          mat.dispose()
        }
      }
      fade()
    }
  }, [scene, intensity]) // eslint-disable-line

  return null
}
