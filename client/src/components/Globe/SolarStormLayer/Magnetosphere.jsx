/**
 * SolarStormLayer/Magnetosphere.jsx
 *
 * Renders the Earth's magnetic shield (magnetosphere).
 *
 * Visual design:
 *   - Instantiates a SphereGeometry distorted in the vertex shader to form a
 *     tear-drop/ellipsoidal shape (compressed facing the wind at +X/+Y, stretched tail at -X/-Y).
 *   - The fragment shader draws shimmering magnetic field lines in pale cyan/blue.
 *   - Gently oscillates and ripples over time to simulate bow shock waves.
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const BASE_RADIUS = 120.0
const FADE_MS     = 1500

const VERT = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;

  void main() {
    vNormal   = normalize(normalMatrix * normal);
    vLocalPos = position;

    // Distort standard sphere to create the comet-like magnetosphere shield:
    // Solar wind comes from top-right (+X, +Y).
    vec3 pos = position;
    
    // Direction dot product with solar wind vector (normalize(vec3(1.0, 0.7, 0.7)))
    vec3 windDir = normalize(vec3(1.0, 0.6, 0.6));
    float alignment = dot(normalize(position), windDir);

    // Compress the bow shock facing the wind (alignment > 0)
    // Stretch the magnetotail on the opposite side (alignment < 0)
    if (alignment > 0.0) {
      float compression = 1.0 - 0.28 * alignment * (0.85 + uIntensity * 0.15);
      pos *= compression;
    } else {
      float extension = 1.0 - 0.45 * alignment;
      pos *= extension;
    }

    // Ripple oscillation: bow shock boundary waves
    float wave = sin(dot(position, vec3(0.06, 0.05, 0.0)) - uTime * 4.0) * 1.5 * (0.5 + uIntensity * 0.5);
    pos += normalize(position) * wave;

    vWorldPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;

  void main() {
    // 3D vector angle to draw concentric field lines
    vec3 normPos = normalize(vLocalPos);

    // Draw magnetic field line bands
    // Sin of latitude creates lines running from pole to pole
    float latitudeLine = sin(normPos.y * 12.0);
    float lines = smoothstep(0.70, 0.85, abs(latitudeLine));

    // Dynamic wave ripple flowing from front to back
    float ripple = sin(vWorldPos.x * 0.18 - uTime * 3.5) * 0.5 + 0.5;

    // Bow shock boundary glow (highly bright rim facing the wind direction)
    vec3 windDir = normalize(vec3(1.0, 0.6, 0.6));
    float alignment = dot(normalize(vWorldPos), windDir);
    float bowShock = smoothstep(0.4, 0.95, alignment);

    // View-angle rim glow for the bubble contour
    float viewDot = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float bubbleEdge = smoothstep(0.3, 0.8, viewDot);

    // Base color: pale cyan/blue
    vec3 baseColor = vec3(0.30, 0.72, 1.0);
    // Solar storm compression turns bow shock orange-cyan
    vec3 shockColor = mix(baseColor, vec3(1.0, 0.53, 0.1), bowShock * uIntensity * 0.8);

    // Compile alpha components:
    // 1. Subtle field lines inside the bubble
    // 2. Bright outer bubble rim
    // 3. Bright bow shock facing the wind
    float alphaLines = lines * 0.08 * (1.0 - bowShock * 0.5);
    float alphaRim   = bubbleEdge * (0.12 + bowShock * 0.10);
    float alphaShock = bowShock * 0.18 * (0.8 + uIntensity * 0.4);

    float finalAlpha = (alphaLines + alphaRim + alphaShock) * uOpacity * (0.7 + uIntensity * 0.3);

    if (finalAlpha < 0.005) discard;

    gl_FragColor = vec4(shockColor, finalAlpha);
  }
`

export default function Magnetosphere({ scene, globalTime, intensity = 1.0, registerAnimated }) {
  useEffect(() => {
    const geo = new THREE.SphereGeometry(BASE_RADIUS, 48, 48)
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
      side:        THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 27
    scene.add(mesh)

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
          scene.remove(mesh)
          geo.dispose()
          mat.dispose()
        }
      }
      fade()
    }
  }, [scene, intensity]) // eslint-disable-line

  return null
}
