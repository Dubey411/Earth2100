import * as THREE from 'three'
import { CONTROL_SETTINGS, EARTH_NIGHT, TEMPERATURE_MAP } from './globeConstants.js'
import { HEAT_FRAGMENT, HEAT_VERTEX } from './heatShader.js'

// Cache geometries for reuse
// react-globe.gl renders the Earth at radius ~100 Three.js units.
// All overlay spheres must be LARGER than 100 to sit on top of it.
const sharedGeometries = {
  sphere:           new THREE.SphereGeometry(100.0,  64,  64),
  sphereHigh:       new THREE.SphereGeometry(100.6,  160, 160), // heat overlay
  sphereCloud:      new THREE.SphereGeometry(102.2,  64,  64),  // cloud layer
  sphereNight:      new THREE.SphereGeometry(101.2,  64,  64),  // night lights
  sphereAtmosphere: new THREE.SphereGeometry(103.5,  48,  48),  // glow shell
}

// Animation state
let cloudRotationSpeed = 0.00055
let lastCloudUpdate = 0
let lastHeatUpdate = 0
let lastNightUpdate = 0
const UPDATE_INTERVAL = 16.67 // 60fps

export function configureGlobeControls({
  controls,
  getStoreState,
  setIsDragging,
  resumeRef,
}) {
  controls.autoRotate = getStoreState().autoRotate
  controls.autoRotateSpeed = CONTROL_SETTINGS.autoRotateSpeed
  controls.enablePan = CONTROL_SETTINGS.enablePan
  controls.enableRotate = getStoreState().handToolActive
  controls.enableDamping = CONTROL_SETTINGS.enableDamping
  controls.dampingFactor = CONTROL_SETTINGS.dampingFactor
  controls.minDistance = CONTROL_SETTINGS.minDistance
  controls.maxDistance = CONTROL_SETTINGS.maxDistance

  let isDragActive = false
  const onStart = () => {
    isDragActive = true
    setIsDragging(true)
    clearTimeout(resumeRef.current)
    controls.autoRotate = false
  }

  const onEnd = () => {
    isDragActive = false
    setIsDragging(false)
    clearTimeout(resumeRef.current)
    resumeRef.current = setTimeout(() => {
      if (getStoreState().autoRotate && !isDragActive) {
        controls.autoRotate = true
      }
    }, CONTROL_SETTINGS.resumeDelayMs)
  }

  controls.addEventListener('start', onStart)
  controls.addEventListener('end', onEnd)

  return { controls, onStart, onEnd }
}

// ============================================================
// NIGHT LIGHTS LAYER
// ============================================================

export function addNightLights(scene, loader) {
  let mesh = null
  let glowMesh = null
  let texture = null
  
  loader.load(EARTH_NIGHT, (tex) => {
    texture = tex
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    
    const material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(0xffdd88),
    })
    
    mesh = new THREE.Mesh(
      sharedGeometries.sphereNight,
      material
    )
    mesh.frustumCulled = true
    scene.add(mesh)
    
    // Atmospheric glow
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uNightTex;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec2 uv = gl_FrontFacing ? 
            vec2(0.5 + atan(vNormal.z, vNormal.x) / (2.0 * 3.14159265),
                 0.5 - asin(vNormal.y) / 3.14159265) :
            vec2(0.5 - atan(vNormal.z, vNormal.x) / (2.0 * 3.14159265),
                 0.5 + asin(vNormal.y) / 3.14159265);
          
          float lightIntensity = texture2D(uNightTex, uv).r;
          float pulse = 0.85 + 0.15 * sin(uTime * 0.5 + uv.x * 20.0 + uv.y * 15.0);
          float glow = lightIntensity * 0.3 * pulse;
          vec3 glowColor = vec3(1.0, 0.8, 0.4) * glow;
          float falloff = 1.0 - abs(vNormal.y) * 0.3;
          glowColor *= falloff;
          
          gl_FragColor = vec4(glowColor, glow * 0.6);
        }
      `,
      uniforms: {
        uNightTex: { value: tex },
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    })
    
    glowMesh = new THREE.Mesh(
      sharedGeometries.sphereAtmosphere,
      glowMaterial
    )
    glowMesh.frustumCulled = true
    scene.add(glowMesh)
  })

  return () => {
    disposeMesh(scene, mesh)
    disposeMesh(scene, glowMesh)
    if (texture) texture.dispose()
  }
}

// ============================================================
// CLOUD LAYER
// NOTE: earth-water.png is a land/water MASK, not a cloud texture.
// It was rendering as a second rotating Earth on top of the globe.
// Cloud layer disabled until a real cloud texture (white-on-transparent PNG)
// is available. The stub keeps EarthGlobe.jsx's ref checks safe.
// ============================================================

export function addCloudLayer(_scene, _loader) {
  // No mesh — return stub so callers don't break
  const holder = { mesh: null }
  return {
    holder,
    dispose: () => {},
  }
}

const getDynamicTemperatureMapUrl = () => {
  // NASA GIBS updates daily, but processing takes 1-2 days.
  // Using 3 days ago guarantees that a complete global satellite image is available.
  const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const dateStr = date.toISOString().split('T')[0];
  
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=MODIS_Terra_Land_Surface_Temp_Day&TIME=${dateStr}&CRS=EPSG:4326&WIDTH=1024&HEIGHT=512&BBOX=-90,-180,90,180`;
};

export function createHeatLayer(scene, loader) {
  let tempTex = null;

  const material = new THREE.ShaderMaterial({
    vertexShader:   HEAT_VERTEX,
    fragmentShader: HEAT_FRAGMENT,
    uniforms: {
      uTime:       { value: 0.0 },
      uIntensity:  { value: 1.0 },
      uTempMap:    { value: null },
      uHasTempMap: { value: 0.0 }, // 0.0 = False, 1.0 = True
    },
    transparent: true,
    depthWrite:  false,
    depthTest:   true,
    // AdditiveBlending: cold regions (near black) add nothing to Earth texture.
    // Hot regions add bright warm colour on top → glow effect, Earth shows through.
    blending:    THREE.AdditiveBlending,
    side:        THREE.FrontSide,
  })

  // Load live NASA GIBS temperature map texture
  const wmsUrl = getDynamicTemperatureMapUrl();
  console.log('🔥 Heat layer: Loading live NASA GIBS WMS texture from:', wmsUrl);

  loader.load(
    wmsUrl,
    (tex) => {
      tempTex = tex;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      
      material.uniforms.uTempMap.value = tex;
      material.uniforms.uHasTempMap.value = 1.0;
      console.log('🔥 Heat layer: Successfully loaded real-time NASA GIBS temperature map texture!');
    },
    undefined,
    (err) => {
      console.warn('🔥 Heat layer: Could not load NASA GIBS texture map, using high-quality procedural fallback:', err);
    }
  );

  const mesh = new THREE.Mesh(sharedGeometries.sphereHigh, material)

  mesh.visible       = false
  mesh.frustumCulled = false
  mesh.renderOrder   = 5
  
  // ✅ CRITICAL: DO NOT ROTATE - Stays fixed to Earth
  // No rotation applied to heat mesh

  scene.add(mesh)
  console.log('🔥 Heat mesh added to scene at radius 100.6, renderOrder 5')

  return {
    mesh,
    dispose: () => {
      scene.remove(mesh)
      material.dispose()
      if (tempTex) {
        tempTex.dispose();
      }
    },
  }
}

export function updateHeatLayer({ heatMesh, t }) {
  if (!heatMesh?.visible) return
  heatMesh.material.uniforms.uTime.value = t
  
  // ✅ CRITICAL: NO ROTATION - Keep heat layer fixed to Earth
  // heatMesh.rotation.y += 0; // Do NOT rotate
}

// ============================================================
// UPDATE FUNCTIONS
// ============================================================

export function updateCloudLayer({ cloudMesh, time, cameraDistance }) {
  if (!cloudMesh) return
  
  const now = performance.now()
  if (now - lastCloudUpdate < UPDATE_INTERVAL) return
  lastCloudUpdate = now
  
  // ✅ Clouds rotate independently
  cloudMesh.rotation.y += cloudRotationSpeed
  cloudMesh.rotation.x = 0.05 + Math.sin(time * 0.01) * 0.005
  
  const distanceFactor = THREE.MathUtils.clamp(
    1.0 - (cameraDistance - 200) / 300,
    0.6,
    1.0
  )
  
  if (cloudMesh.material) {
    const baseOpacity = 0.35
    const targetOpacity = baseOpacity * distanceFactor
    if (Math.abs(cloudMesh.material.opacity - targetOpacity) > 0.001) {
      cloudMesh.material.opacity = targetOpacity
    }
  }
}

export function updateNightLights({ scene, time }) {
  if (!scene) return
  
  const now = performance.now()
  if (now - lastNightUpdate < UPDATE_INTERVAL) return
  lastNightUpdate = now
  
  scene.children.forEach((child) => {
    if (child.isMesh && child.material && child.material.uniforms) {
      if (child.material.uniforms.uTime) {
        child.material.uniforms.uTime.value = time
      }
    }
  })
}

// ============================================================
// DISPOSAL FUNCTIONS
// ============================================================

function disposeMesh(scene, mesh) {
  if (!mesh) return
  
  scene.remove(mesh)
  
  if (mesh.geometry) {
    if (mesh.geometry !== sharedGeometries.sphere &&
        mesh.geometry !== sharedGeometries.sphereHigh &&
        mesh.geometry !== sharedGeometries.sphereCloud &&
        mesh.geometry !== sharedGeometries.sphereNight &&
        mesh.geometry !== sharedGeometries.sphereAtmosphere) {
      mesh.geometry.dispose()
    }
  }
  
  const material = mesh.material
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
  } else {
    disposeMaterial(material)
  }
}

function disposeMaterial(material) {
  if (!material) return
  
  if (material.map) material.map.dispose()
  if (material.bumpMap) material.bumpMap.dispose()
  if (material.alphaMap) material.alphaMap.dispose()
  if (material.emissiveMap) material.emissiveMap.dispose()
  
  if (material.uniforms) {
    Object.values(material.uniforms).forEach((uniform) => {
      if (uniform.value?.isTexture) {
        uniform.value.dispose()
      }
    })
  }
  
  material.dispose()
}

export function setCloudRotationSpeed(speed) {
  cloudRotationSpeed = speed
}

export function getCloudRotationSpeed() {
  return cloudRotationSpeed
}