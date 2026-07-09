/**
 * CloudLayer.jsx — Swirling storm clouds over warm ocean waters.
 *
 * Renders a procedural cloud overlay at radius 103.1.
 * Storm clouds dynamically shift from West Pacific (Indonesia) to the
 * Central/Eastern Pacific (Peru) matching the location of warm sea surface temperatures.
 *
 * Blending: NormalBlending (alphablend) for dense cloud cover.
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const CLOUDS_RADIUS = 103.1
const FADE_IN_MS    = 1000
const FADE_OUT_MS   = 600

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
  uniform float uWarmCenter; // [0, 1] maps West Pacific to East Pacific

  varying vec2 vUv;
  varying vec3 vViewNormal;

  // Procedural noise functions for cloud texture
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
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.2 + vec2(1.5, 3.7);
      a *= 0.48;
    }
    return v;
  }

  void main() {
    float lat = (0.5 - vUv.y) * 180.0;
    float lng = (vUv.x - 0.5) * 360.0;

    // Confine cloud formation to the equatorial belt: lat [-14, 14]
    float latWeight = smoothstep(14.0, 0.0, abs(lat));
    if (latWeight < 0.01) discard;

    // Normalized Pacific coordinate: 120E (0.0) to 80W (1.0)
    float normLng = 0.0;
    if (lng >= 120.0) {
      normLng = (lng - 120.0) / 160.0;
    } else if (lng <= -80.0) {
      normLng = (lng + 360.0 - 120.0) / 160.0;
    } else {
      discard;
    }

    if (normLng < 0.0 || normLng > 1.0) discard;

    float lngWeight = smoothstep(0.0, 0.10, normLng) * smoothstep(1.0, 0.90, normLng);
    float boundaryWeight = latWeight * lngWeight;

    // Normal center = 0.12 (Indonesia). El Nino center = 0.78 (Central/East Pacific).
    float center = mix(0.12, 0.78, uWarmCenter);
    float dist = abs(normLng - center);
    
    // Cloud density envelope centered over warm SST water
    float cloudEnvelope = exp(-(dist * dist) / 0.055);
    
    // Animate cloud drift
    vec2 drift = vUv * 6.5 + vec2(uTime * 0.02, -uTime * 0.01);
    float cloudNoise = fbm(drift);

    // Dynamic cloud density (increases during El Nino peak)
    float densityCutoff = mix(0.42, 0.35, uWarmCenter); 
    float clouds = smoothstep(densityCutoff, 0.85, cloudNoise) * cloudEnvelope;

    if (clouds < 0.01) discard;

    // Normal: soft white convective clouds
    // El Nino: slightly darker storm cloud centers
    vec3 baseCol = vec3(0.92, 0.95, 0.98);
    vec3 stormCol = vec3(0.38, 0.44, 0.52);
    vec3 color = mix(baseCol, stormCol, uWarmCenter * clouds * 0.50);

    // View-angle falloff for smooth globe integration
    float rim = abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
    float rimFade = smoothstep(0.0, 0.20, rim);

    float alpha = clouds * boundaryWeight * uOpacity * rimFade * 0.72;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
  }
`

export default function CloudLayer({ scene, registerAnimated }) {
  useEffect(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:       { value: 0.0 },
        uOpacity:    { value: 0.0 },
        uWarmCenter: { value: 0.0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
      side:        THREE.FrontSide,
    })

    const geo  = new THREE.SphereGeometry(CLOUDS_RADIUS, 96, 48)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y    = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 14

    // Set identification metadata for Raycaster click
    mesh.userData = {
      ensoType: 'clouds',
      name: 'Convective Cloud Formations',
      desc: 'Clouds that form over the warmest parts of the ocean. Normally positioned over Indonesia, they shift to the Central and Eastern Pacific during El Niño, triggering severe storm cycles.'
    }

    scene.add(mesh)

    const startMs = performance.now()

    const unregister = registerAnimated((ensoTime) => {
      const elapsed = performance.now() - startMs
      material.uniforms.uOpacity.value = Math.min(elapsed / FADE_IN_MS, 1.0)
      material.uniforms.uTime.value = ensoTime

      // Match SST warm center transition
      let warmVal = 0.0
      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        warmVal = (ensoTime - 4.0) / 6.0
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        warmVal = 1.0
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        warmVal = 1.0 - (ensoTime - 18.0) / 6.0
      }

      const easedWarmVal = THREE.MathUtils.smoothstep(warmVal, 0.0, 1.0)
      material.uniforms.uWarmCenter.value = easedWarmVal
    })

    return () => {
      unregister()
      const fadeStart = performance.now()
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
