/**
 * StormVeil.jsx — Dark storm atmosphere veil over flood hotspots.
 *
 * Replaces the old Clouds.jsx. Uses a lower-overhead procedural dark haze:
 *  - Drifting fBm noise darkens the atmosphere above flood zones
 *  - Responds to lightningRef for flash brightening
 *  - Perimeter fade so there's no hard edge
 *
 * Radius  : 100.85
 * Blending: NormalBlending (alpha composite, not additive)
 * Fade    : 900ms in, 500ms out
 */
import { useEffect } from 'react'
import * as THREE from 'three'
import { FLOOD_HOTSPOTS } from './constants'

const VEIL_RADIUS = 100.85
const FADE_IN_MS  = 900
const FADE_OUT_MS = 500

const VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vViewNormal;
  void main() {
    vUv         = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uLightning;
  uniform vec2  uHotspots[5];

  varying vec2 vUv;
  varying vec3 vViewNormal;

  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.y*u.x;
  }
  float fbm(vec2 p) {
    float v=0.0, a=0.5;
    for(int i=0;i<4;i++){v+=a*noise(p);p*=2.1;a*=0.48;}
    return v;
  }

  void main() {
    float lat    = (0.5 - vUv.y) * 180.0;
    float lng    = (vUv.x - 0.5) * 360.0;
    float cosLat = cos(radians(lat));

    // Hotspot proximity mask (wider sigma for the veil → bleeds naturally)
    float mask = 0.0;
    for (int i = 0; i < 5; i++) {
      float dLat = lat - uHotspots[i].x;
      float dLng = (lng - uHotspots[i].y) * cosLat;
      mask += exp(-(dLat*dLat + dLng*dLng) / (2.0 * 196.0)); // sigma = 14°
    }
    mask = clamp(mask, 0.0, 1.0);
    if (mask < 0.01) discard;

    // Drifting storm noise — slow, dark swirls
    vec2 drift = vUv * 5.5 + vec2(uTime * 0.009, -uTime * 0.006);
    float n    = fbm(drift);
    float n2   = fbm(drift * 1.6 + 3.7);
    float storm = mix(n, n2, 0.38);
    storm = smoothstep(0.30, 0.80, storm);

    // Lightning flash: sudden brightness in the cloud
    float flash  = uLightning;
    vec3 darkCol = vec3(0.04, 0.06, 0.12);
    vec3 litCol  = vec3(0.55, 0.72, 0.95);
    vec3 color   = mix(darkCol, litCol, flash * 0.70);

    // Limb fade
    float rim     = abs(dot(normalize(vViewNormal), vec3(0,0,1)));
    float rimFade = smoothstep(0.0, 0.20, rim);

    float alpha = storm * mask * uOpacity * rimFade * 0.28;
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(color, alpha);
  }
`

export default function StormVeil({ scene, lightningRef, registerAnimated }) {
  useEffect(() => {
    const hotspotUniforms = FLOOD_HOTSPOTS.map(([lat, lng]) => new THREE.Vector2(lat, lng))

    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:      { value: 0.0 },
        uOpacity:   { value: 0.0 },
        uLightning: { value: 0.0 },
        uHotspots:  { value: hotspotUniforms },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
      side:        THREE.FrontSide,
    })

    const geo  = new THREE.SphereGeometry(VEIL_RADIUS, 48, 48)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y    = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 6
    scene.add(mesh)

    const startMs = performance.now()

    const unregister = registerAnimated((t) => {
      material.uniforms.uOpacity.value   = Math.min((performance.now() - startMs) / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value      = t
      material.uniforms.uLightning.value = lightningRef.current.value
    })

    return () => {
      unregister()
      const fadeStart  = performance.now()
      const curOpacity = material.uniforms.uOpacity.value
      const fadeOut = () => {
        const p = (performance.now() - fadeStart) / FADE_OUT_MS
        if (p < 1.0) {
          material.uniforms.uOpacity.value = curOpacity * (1.0 - p)
          requestAnimationFrame(fadeOut)
        } else {
          scene.remove(mesh)
          geo.dispose()
          material.dispose()
        }
      }
      requestAnimationFrame(fadeOut)
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
