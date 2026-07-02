// import * as THREE from 'three'
// import { CLOUD_IMG, CONTROL_SETTINGS, EARTH_NIGHT } from './globeConstants.js'
// import { HEAT_FRAGMENT, HEAT_VERTEX } from './heatShader.js'

// export function configureGlobeControls({
//   controls,
//   getStoreState,
//   setIsDragging,
//   resumeRef,
// }) {
//   controls.autoRotate = getStoreState().autoRotate
//   controls.autoRotateSpeed = CONTROL_SETTINGS.autoRotateSpeed
//   controls.enablePan = CONTROL_SETTINGS.enablePan
//   controls.enableRotate = getStoreState().handToolActive
//   controls.enableDamping = CONTROL_SETTINGS.enableDamping
//   controls.dampingFactor = CONTROL_SETTINGS.dampingFactor
//   controls.minDistance = CONTROL_SETTINGS.minDistance
//   controls.maxDistance = CONTROL_SETTINGS.maxDistance

//   let isDragActive = false
//   const onStart = () => {
//     isDragActive = true
//     setIsDragging(true)
//     clearTimeout(resumeRef.current)
//     controls.autoRotate = false
//   }

//   const onEnd = () => {
//     isDragActive = false
//     setIsDragging(false)
//     clearTimeout(resumeRef.current)
//     resumeRef.current = setTimeout(() => {
//       if (getStoreState().autoRotate && !isDragActive) {
//         controls.autoRotate = true
//       }
//     }, CONTROL_SETTINGS.resumeDelayMs)
//   }

//   controls.addEventListener('start', onStart)
//   controls.addEventListener('end', onEnd)

//   return { controls, onStart, onEnd }
// }

// export function addNightLights(scene, loader) {
//   let mesh = null
//   loader.load(EARTH_NIGHT, (tex) => {
//     tex.colorSpace = THREE.SRGBColorSpace
//     mesh = new THREE.Mesh(
//       new THREE.SphereGeometry(101.2, 64, 64),
//       new THREE.MeshBasicMaterial({
//         map: tex,
//         transparent: true,
//         opacity: 0.38,
//         blending: THREE.AdditiveBlending,
//         depthWrite: false,
//       }),
//     )
//     scene.add(mesh)
//   })

//   return () => disposeMesh(scene, mesh)
// }

// export function addCloudLayer(scene, loader) {
//   const holder = { mesh: null }
//   loader.load(CLOUD_IMG, (tex) => {
//     tex.colorSpace = THREE.SRGBColorSpace
//     holder.mesh = new THREE.Mesh(
//       new THREE.SphereGeometry(102.2, 64, 64),
//       new THREE.MeshLambertMaterial({
//         map: tex,
//         transparent: true,
//         opacity: 0.30,
//         depthWrite: false,
//       }),
//     )
//     scene.add(holder.mesh)
//   })

//   return {
//     holder,
//     dispose: () => disposeMesh(scene, holder.mesh),
//   }
// }

// export function createHeatLayer(scene, maskTexture) {
//   const material = new THREE.ShaderMaterial({
//     vertexShader: HEAT_VERTEX,
//     fragmentShader: HEAT_FRAGMENT,
//     uniforms: {
//       uTime: { value: 0.0 },
//       uIntensity: { value: 0.0 },
//       uZoom: { value: 0.0 },
//       uMaskTex: { value: maskTexture },
//     },
//     transparent: true,
//     depthWrite: false,
//     blending: THREE.NormalBlending,
//     side: THREE.DoubleSide,
//   })

//   const mesh = new THREE.Mesh(
//     new THREE.SphereGeometry(100.55, 160, 160),
//     material,
//   )
//   mesh.visible = false
//   scene.add(mesh)

//   return {
//     mesh,
//     dispose: () => disposeMesh(scene, mesh),
//   }
// }

// export function updateHeatLayer({ heatMesh, t, cameraDistance }) {
//   if (!heatMesh?.visible) return

//   const uniforms = heatMesh.material.uniforms
//   uniforms.uTime.value = t

//   const scale = 1.01 + 0.01 * Math.sin(t * 1.2566)
//   heatMesh.scale.set(scale, scale, scale)

//   uniforms.uZoom.value = THREE.MathUtils.clamp((450 - cameraDistance) / 270, 0, 1)
// }

// function disposeMesh(scene, mesh) {
//   if (!mesh) return
//   scene.remove(mesh)
//   mesh.geometry?.dispose?.()
//   const material = mesh.material
//   if (Array.isArray(material)) {
//     material.forEach(disposeMaterial)
//   } else {
//     disposeMaterial(material)
//   }
// }

// function disposeMaterial(material) {
//   if (!material) return
//   Object.values(material).forEach((value) => {
//     if (value?.isTexture) value.dispose()
//   })
//   material.dispose?.()
// }




import * as THREE from 'three'
import { CLOUD_IMG, CONTROL_SETTINGS, EARTH_NIGHT } from './globeConstants.js'
import { HEAT_FRAGMENT, HEAT_VERTEX } from './heatShader.js'

// Cache geometries for reuse
const sharedGeometries = {
  sphere: new THREE.SphereGeometry(1, 64, 64),
  sphereHigh: new THREE.SphereGeometry(1, 160, 160),
  sphereCloud: new THREE.SphereGeometry(1.022, 64, 64),
  sphereNight: new THREE.SphereGeometry(1.012, 64, 64),
  sphereAtmosphere: new THREE.SphereGeometry(1.035, 48, 48),
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
// ============================================================

export function addCloudLayer(scene, loader) {
  const holder = { mesh: null }
  let texture = null
  
  loader.load(CLOUD_IMG, (tex) => {
    texture = tex
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    
    const material = new THREE.MeshPhongMaterial({
      map: tex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      shininess: 0,
      emissive: new THREE.Color(0x88aaff),
      emissiveIntensity: 0.1,
    })
    
    holder.mesh = new THREE.Mesh(
      sharedGeometries.sphereCloud,
      material
    )
    holder.mesh.frustumCulled = true
    holder.mesh.rotation.x = 0.05
    scene.add(holder.mesh)
    
    holder.material = material
  })

  return {
    holder,
    dispose: () => {
      disposeMesh(scene, holder.mesh)
      if (texture) texture.dispose()
    },
  }
}

// ============================================================
// HEAT LAYER - UPDATED WITH CLOUD SYNC
// ============================================================

export function createHeatLayer(scene, maskTexture) {
  const material = new THREE.ShaderMaterial({
    vertexShader: HEAT_VERTEX,
    fragmentShader: HEAT_FRAGMENT,
    uniforms: {
      uTime: { value: 0.0 },
      uIntensity: { value: 0.0 },
      uZoom: { value: 0.0 },
      uMaskTex: { value: maskTexture },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    extensions: {
      derivatives: true,
    },
  })

  const mesh = new THREE.Mesh(
    sharedGeometries.sphereHigh,
    material
  )
  mesh.visible = false
  mesh.frustumCulled = true
  scene.add(mesh)

  return {
    mesh,
    dispose: () => {
      disposeMesh(scene, mesh)
    },
  }
}

// ============================================================
// UPDATED UPDATE FUNCTIONS WITH THROTTLING
// ============================================================

export function updateCloudLayer({ cloudMesh, time, cameraDistance }) {
  if (!cloudMesh) return
  
  const now = performance.now()
  if (now - lastCloudUpdate < UPDATE_INTERVAL) return
  lastCloudUpdate = now
  
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

export function updateHeatLayer({ heatMesh, t, cameraDistance, cloudRotation }) {
  if (!heatMesh?.visible) return
  
  const now = performance.now()
  if (now - lastHeatUpdate < UPDATE_INTERVAL) return
  lastHeatUpdate = now

  const uniforms = heatMesh.material.uniforms
  
  // SYNC WITH CLOUDS: Heat moves with cloud rotation
  const syncedTime = t + cloudRotation * 8.0
  if (uniforms.uTime.value !== syncedTime) {
    uniforms.uTime.value = syncedTime
  }

  // Scale animation
  const scale = 1.01 + 0.01 * Math.sin(t * 1.2566)
  if (heatMesh.scale.x !== scale) {
    heatMesh.scale.set(scale, scale, scale)
  }

  const zoom = THREE.MathUtils.clamp((450 - cameraDistance) / 270, 0, 1)
  if (uniforms.uZoom.value !== zoom) {
    uniforms.uZoom.value = zoom
  }
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

// Export controls
export function setCloudRotationSpeed(speed) {
  cloudRotationSpeed = speed
}

export function getCloudRotationSpeed() {
  return cloudRotationSpeed
}
