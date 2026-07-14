/**
 * SolarStormLayer/AuroraShader.jsx
 *
 * Renders a single bounding sphere just above the atmosphere (radius ~102.5).
 * The fragment shader uses geographic latitude to draw animated, shimmering
 * auroral curtains at both polar regions (60°–90° N and S).
 *
 * Shader features:
 *   - Animated sine/cosine wave shimmer simulating polar light curtains.
 *   - Gradient transitions between Green (#00ff88), Cyan (#00ddff), Purple (#8844ff), and Pink (#ff44aa).
 *   - Breathing/pulsing overall intensity driven by the storm severity.
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GLOBE_R  = 102.5
const FADE_MS  = 1200

const VERT = /* glsl */`
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vWorldPos   = position;
    vNormal     = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIntensity; // 0..1 from store intensity

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  const float PI = 3.14159265359;

  // Simple 2D noise for the shimmering wave curtains
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i),      b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.y*u.x;
  }

  void main() {
    // Normal normalized position on the sphere
    vec3 normPos = normalize(vWorldPos);

    // Compute latitude in degrees: asin(y) maps to [-PI/2, PI/2]
    float latitude = asin(normPos.y) * 180.0 / PI;
    float absLat   = abs(latitude);

    // Aurora bounds: 58° to 90° latitude
    if (absLat < 58.0) discard;

    // Normalize polar band coordinates [0.0, 1.0] from boundary to pole
    float polarT = (absLat - 58.0) / (90.0 - 58.0);

    // Auroral curtain bands: concentric rings with wavy disturbances
    float angle = atan(normPos.z, normPos.x);

    // Slow shimmering wave pattern (combining sine waves and noise)
    float wave = sin(angle * 7.0 + uTime * 1.5) * 0.12 * sin(uTime * 0.4);
    wave      += cos(angle * 12.0 - uTime * 2.2) * 0.06;

    // High frequency shimmering noise
    float shimmer = noise(vec2(angle * 15.0, uTime * 2.5)) * 0.10;

    // Radial coordinate for the curtain lines
    float r = polarT + wave + shimmer;

    // Generate 3 distinct curtain bands
    float band1 = smoothstep(0.1, 0.2, r) * (1.0 - smoothstep(0.35, 0.45, r));
    float band2 = smoothstep(0.4, 0.5, r) * (1.0 - smoothstep(0.60, 0.70, r));
    float band3 = smoothstep(0.65, 0.75, r) * (1.0 - smoothstep(0.85, 0.95, r));

    float curtain = max(band1, max(band2 * 0.7, band3 * 0.4));

    // Dynamic color selection based on latitude/radius position
    // Colors: Green (#00ff88), Cyan (#00ddff), Purple (#8844ff), Pink (#ff44aa)
    vec3 cGreen  = vec3(0.0, 1.0, 0.53);
    vec3 cCyan   = vec3(0.0, 0.86, 1.0);
    vec3 cPurple = vec3(0.53, 0.26, 1.0);
    vec3 cPink   = vec3(1.0, 0.26, 0.66);

    // Base color blend
    vec3 color = cGreen;
    if (r > 0.4) {
      color = mix(cGreen, cCyan, (r - 0.4) / 0.2);
    }
    if (r > 0.6) {
      color = mix(cCyan, cPurple, (r - 0.6) / 0.15);
    }
    if (r > 0.75) {
      color = mix(cPurple, cPink, (r - 0.75) / 0.2);
    }

    // View-angle rim fade (fade out when looking directly, thicker at silhouette edge)
    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float rimF = smoothstep(0.1, 0.6, rim);

    // Breathing pulse over time
    float pulse = 0.85 + 0.15 * sin(uTime * 0.8);

    // Final alpha mapping
    float alpha = curtain * rimF * pulse * uOpacity * (0.35 + uIntensity * 0.65);

    if (alpha < 0.005) discard;

    // Add extra brightness at the core of the curtains
    gl_FragColor = vec4(color, alpha);
  }
`

export default function AuroraShader({ scene, globalTime, intensity = 1.0, registerAnimated }) {
  const meshRef = useRef(null)

  useEffect(() => {
    const geo = new THREE.SphereGeometry(GLOBE_R, 64, 64)
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
      side:        THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 28
    scene.add(mesh)
    meshRef.current = mesh

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
