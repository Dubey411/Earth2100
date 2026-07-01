import * as THREE from 'three'
import { CLOUD_IMG, CONTROL_SETTINGS, EARTH_NIGHT } from './globeConstants.js'
import { HEAT_FRAGMENT, HEAT_VERTEX } from './heatShader.js'

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

export function addNightLights(scene, loader) {
  let mesh = null
  loader.load(EARTH_NIGHT, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(101.2, 64, 64),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    scene.add(mesh)
  })

  return () => disposeMesh(scene, mesh)
}

export function addCloudLayer(scene, loader) {
  const holder = { mesh: null }
  loader.load(CLOUD_IMG, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
    holder.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(102.2, 64, 64),
      new THREE.MeshLambertMaterial({
        map: tex,
        transparent: true,
        opacity: 0.30,
        depthWrite: false,
      }),
    )
    scene.add(holder.mesh)
  })

  return {
    holder,
    dispose: () => disposeMesh(scene, holder.mesh),
  }
}

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
  })

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(100.55, 160, 160),
    material,
  )
  mesh.visible = false
  scene.add(mesh)

  return {
    mesh,
    dispose: () => disposeMesh(scene, mesh),
  }
}

export function updateHeatLayer({ heatMesh, t, cameraDistance }) {
  if (!heatMesh?.visible) return

  const uniforms = heatMesh.material.uniforms
  uniforms.uTime.value = t

  const scale = 1.01 + 0.01 * Math.sin(t * 1.2566)
  heatMesh.scale.set(scale, scale, scale)

  uniforms.uZoom.value = THREE.MathUtils.clamp((450 - cameraDistance) / 270, 0, 1)
}

function disposeMesh(scene, mesh) {
  if (!mesh) return
  scene.remove(mesh)
  mesh.geometry?.dispose?.()
  const material = mesh.material
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
  } else {
    disposeMaterial(material)
  }
}

function disposeMaterial(material) {
  if (!material) return
  Object.values(material).forEach((value) => {
    if (value?.isTexture) value.dispose()
  })
  material.dispose?.()
}
