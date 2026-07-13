/**
 * AirPollutionLayer/SmogDome.jsx
 *
 * Renders a volumetric smog dome tangent to the globe surface.
 * Smog thickness and colors are driven by real-time AQI.
 *
 * Fragment shader:
 *   - Uses procedural fBm noise to simulate swirling toxic smog
 *   - Colors range from golden-brown haze to deep toxic violet
 *   - Convective pulsing rate is tied to pollution level
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { getAqiCategory } from './constants'

const GLOBE_R  = 100.7
const FADE_MS  = 1000

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
  uniform float uAqi;
  uniform vec3  uColor;

  varying vec2 vUv;
  varying vec3 vNormal;

  // Noise generators for thick atmospheric smog
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i),      b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.y*u.x;
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec2(2.1, 3.4);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Distance from center of plane
    vec2 d = vUv - 0.5;
    float r = length(d);
    if (r > 0.5) discard;

    // Density falloff from core to edge
    float density = smoothstep(0.5, 0.0, r);

    // Dynamic swirling smog noise
    vec2 drift = vUv * 4.0 + vec2(uTime * 0.12, -uTime * 0.08);
    float n = fbm(drift);

    // Thick core vs wispy edges (lowered threshold for better visibility)
    float smog = smoothstep(0.18, 0.75, n * density);

    // View-angle rim falloff
    float rim = abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    float rimF = smoothstep(0.0, 0.20, rim);

    // Scale overall opacity based on AQI
    float baseAlpha = clamp(uAqi / 300.0, 0.35, 0.95);
    float alpha = smog * baseAlpha * uOpacity * rimF * 0.90;

    if (alpha < 0.01) discard;

    // Visible dark charcoal/black soot color with a toxic category undertone
    vec3 baseBlack = vec3(0.14, 0.13, 0.15);
    vec3 finalCol = mix(baseBlack, uColor, 0.18);

    gl_FragColor = vec4(finalCol, alpha);
  }
`

export default function SmogDome({ globe, scene, hotspot, liveAqi, registerAnimated, timelineScale = 1.0 }) {
  useEffect(() => {
    if (!globe) return

    const aqi       = (liveAqi?.aqi ?? hotspot.baseAqi) * Math.min(timelineScale, 3.0)
    const cat       = getAqiCategory(Math.min(aqi, 500))
    const color     = new THREE.Color(cat.color)

    // Scaling size proportional to severity, also boosted by timeline scenario
    const scaleFactor = (0.55 + Math.min(aqi / 300, 0.70)) * Math.min(timelineScale, 3.0)
    const sizeRad = scaleFactor * 14.5 * Math.PI / 180 * GLOBE_R

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },
        uAqi:     { value: aqi },
        uColor:   { value: color },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending, // Alpha blending so smog accumulates visibility
      side:        THREE.DoubleSide,
    })

    const geo  = new THREE.PlaneGeometry(sizeRad * 2, sizeRad * 2, 1, 1)
    const mesh = new THREE.Mesh(geo, mat)

    // Position and align tangent to surface using globe.getCoords
    const coords = globe.getCoords(hotspot.lat, hotspot.lng)
    const center = new THREE.Vector3(coords.x, coords.y, coords.z)
    const up        = center.clone().normalize()
    const arbitrary = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right     = up.clone().cross(arbitrary).normalize()
    const fwd       = up.clone().cross(right).normalize()

    mesh.position.copy(center)
    mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, fwd, up))
    mesh.frustumCulled = false
    mesh.renderOrder   = 23

    mesh.userData = {
      pollutionType: 'dome',
      hotspotId:     hotspot.id,
      name:          `${hotspot.name} Smog Accumulation`,
      desc:          `Localized atmospheric inversion layer. Thick soot, particulate matter (PM2.5), and nitrogen oxides trap heat and block solar radiation. Current AQI level: ${aqi} (${cat.label}).`,
    }

    scene.add(mesh)

    const startMs = performance.now()
    const unregister = registerAnimated((t) => {
      const elapsed = (performance.now() - startMs) / FADE_MS
      mat.uniforms.uOpacity.value = Math.min(elapsed, 1.0)
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
  }, [scene, hotspot, liveAqi, timelineScale]) // eslint-disable-line

  return null
}
