/**
 * AirPollutionLayer/SmogDome.jsx
 * 
 * FIXED: Correct plane orientation, better visibility
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
    vec2 d = vUv - 0.5;
    float r = length(d);
    if (r > 0.5) discard;

    float density = smoothstep(0.5, 0.0, r);
    vec2 drift = vUv * 4.0 + vec2(uTime * 0.12, -uTime * 0.08);
    float n = fbm(drift);
    float smog = smoothstep(0.35, 0.85, n * density);

    float rim = abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    float rimF = smoothstep(0.0, 0.25, rim);

    // INCREASED VISIBILITY
    float baseAlpha = clamp(uAqi / 300.0, 0.30, 0.95);
    float alpha = smog * baseAlpha * uOpacity * rimF * 0.90;

    if (alpha < 0.01) discard;

    // MORE VISIBLE COLOR
    vec3 baseColor = vec3(0.08, 0.06, 0.10);
    vec3 finalCol = mix(baseColor, uColor, 0.15);

    gl_FragColor = vec4(finalCol, alpha);
  }
`

function latLngToCartesian(lat, lng, r) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (90 - lng) * Math.PI / 180
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.cos(phi)
  const z = r * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(-z, y, x)
}

export default function SmogDome({ scene, hotspot, liveAqi, registerAnimated }) {
  useEffect(() => {
    const aqi = liveAqi?.aqi ?? hotspot.baseAqi
    const cat = getAqiCategory(aqi)
    const color = new THREE.Color(cat.color)

    const scaleFactor = 0.55 + Math.min(aqi / 300, 0.70)
    const sizeRad = scaleFactor * 7.5 * Math.PI / 180 * GLOBE_R

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
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    })

    const geo  = new THREE.PlaneGeometry(sizeRad * 2, sizeRad * 2, 1, 1)
    const mesh = new THREE.Mesh(geo, mat)

    const center    = latLngToCartesian(hotspot.lat, hotspot.lng, GLOBE_R)
    const up        = center.clone().normalize()
    const arbitrary = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right     = up.clone().cross(arbitrary).normalize()
    const fwd       = up.clone().cross(right).normalize()

    mesh.position.copy(center)
    mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, fwd, up))
    mesh.frustumCulled = false
    mesh.renderOrder   = 15 // Lower render order

    mesh.userData = {
      pollutionType: 'dome',
      hotspotId:     hotspot.id,
      name:          `${hotspot.name} Smog Accumulation`,
      desc:          `AQI level: ${aqi} (${cat.label}).`,
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
  }, [scene, hotspot, liveAqi])

  return null
}