/**
 * StormLayer/EyeWall.jsx
 *
 * Renders the storm's eye wall — a pulsing, glowing ring at the center.
 *
 * The eye itself is a dark void (no particles rendered there by CycloneVortex).
 * The eye wall ring:
 *   - Pulsing opacity (rapid inner convection visual)
 *   - Category-colored with an outer glow halo
 *   - Drawn as a torus / flat ring mesh at globe surface
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { catToColor } from './constants'

const GLOBE_R  = 100.6
const FADE_MS  = 1400

const VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3  uColor;
  uniform float uPulseRate; // storm-specific pulse rate

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Ring coordinates: x=0.5,y=0.5 is center
    vec2 d = vUv - 0.5;
    float r = length(d);

    // Only show a thin ring band [0.32, 0.50]
    float ringMask = smoothstep(0.30, 0.36, r) * (1.0 - smoothstep(0.46, 0.50, r));
    if (ringMask < 0.005) discard;

    // Rotating bright spots around the ring (eye wall convection cells)
    float angle   = atan(d.y, d.x);
    float cells   = sin(angle * 6.0 + uTime * uPulseRate * 3.0) * 0.5 + 0.5;
    cells = pow(cells, 2.5);

    // Pulse the whole ring
    float pulse = 0.7 + 0.3 * sin(uTime * uPulseRate * 1.5);

    // View-angle rim fade
    float rim   = abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    float rimF  = smoothstep(0.0, 0.3, rim);

    float alpha = ringMask * (0.60 + 0.40 * cells) * pulse * uOpacity * rimF;
    if (alpha < 0.01) discard;

    vec3 col = mix(vec3(1.0), uColor, 0.55);
    gl_FragColor = vec4(col, alpha);
  }
`

function latLngToCartesian(lat, lng, r) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (90 - lng) * Math.PI / 180
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.cos(phi)
  const z = r * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(-z, y, x) // apply globe Y rot -PI/2
}

export default function EyeWall({ scene, storm, registerAnimated }) {
  useEffect(() => {
    const catCol   = new THREE.Color(catToColor(storm.cat))
    // Scale eye wall size proportional to radius (~15% of storm radius in degrees)
    const sizeRad  = storm.radius * 0.20 * Math.PI / 180 * GLOBE_R

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:      { value: 0 },
        uOpacity:   { value: 0 },
        uColor:     { value: catCol },
        uPulseRate: { value: 1.2 + storm.intensity * 0.8 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    })

    const geo  = new THREE.PlaneGeometry(sizeRad * 2, sizeRad * 2, 1, 1)
    const mesh = new THREE.Mesh(geo, mat)

    // Position and orient the plane tangent to the globe surface
    const center    = latLngToCartesian(storm.lat, storm.lng, GLOBE_R)
    const up        = center.clone().normalize()
    const arbitrary = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right     = up.clone().cross(arbitrary).normalize()
    const fwd       = up.clone().cross(right).normalize()

    mesh.position.copy(center)
    mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, fwd, up))
    mesh.frustumCulled = false
    mesh.renderOrder   = 21
    mesh.userData = {
      stormType: 'eyewall',
      stormId:   storm.id,
      name:      `${storm.name} — Eye Wall`,
      desc:      'The eye wall is the most destructive part of a tropical cyclone — a ring of towering thunderstorms surrounding the calm eye, generating maximum wind speeds and rainfall.',
    }

    scene.add(mesh)

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
        else { scene.remove(mesh); geo.dispose(); mat.dispose() }
      }
      fade()
    }
  }, [scene, storm]) // eslint-disable-line

  return null
}
