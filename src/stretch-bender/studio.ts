import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Procedural softbox environment adapted from Machine Skill kit/lab-kit.js,
 * studioEnvironment and Lab._initStudio, under the MIT license. The complete
 * upstream license is retained with the stretch-bender documentation.
 *
 * Geometry uses the user's machine coordinates: X = bed, Y = depth, Z = up.
 * Only this outer wrapper converts those coordinates to Three.js Y-up.
 */

export type StudioView = 'reference' | 'front' | 'top' | 'left' | 'right'

export interface BenderStudio {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  world: THREE.Group
  grid: THREE.GridHelper
  render(): void
  resize(): void
  view(name: StudioView): void
  focus(pointMachine: THREE.Vector3): void
  dispose(): void
}

function createEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene()
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xa7a7a2, side: THREE.BackSide }),
  )
  scene.add(room)

  const panel = (
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    intensity: number,
    color = 0xffffff,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      }),
    )
    mesh.position.set(x, y, z)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
  }

  // Wide light sources and dark flags leave readable reflections in steel.
  panel(14, 10, 0, 14, 2, 2.5)
  panel(4, 14, -12, 4, 8, 4.2, 0xfff5e9)
  panel(2.2, 14, 13, 5, -6, 4.8, 0xe2eeff)
  panel(2.2, 14, -11, 5, -9, 3.2)
  panel(8, 3, 6, 1.5, 12, 1.2)
  panel(5, 16, 12, 4, 7, 0.025)
  panel(4, 16, -13, 4, -2, 0.025)
  panel(16, 3, 0, -1, -14, 0.035)

  const generator = new THREE.PMREMGenerator(renderer)
  const environment = generator.fromScene(scene, 0.025)
  generator.dispose()
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  })
  return environment
}

function createContactTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 124)
    gradient.addColorStop(0, 'rgba(27,31,30,0.20)')
    gradient.addColorStop(0.45, 'rgba(27,31,30,0.12)')
    gradient.addColorStop(0.75, 'rgba(27,31,30,0.045)')
    gradient.addColorStop(1, 'rgba(27,31,30,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 256, 256)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const CAMERA_DIRECTIONS: Record<StudioView, THREE.Vector3> = {
  reference: new THREE.Vector3(-5.5, 2.7, 7).normalize(),
  front: new THREE.Vector3(0, 0.12, 1).normalize(),
  top: new THREE.Vector3(0, 1, 0.0001).normalize(),
  left: new THREE.Vector3(-1, 0.13, 0).normalize(),
  right: new THREE.Vector3(1, 0.13, 0).normalize(),
}

const MACHINE_BOUNDS = new THREE.Box3(
  new THREE.Vector3(-3.65, 0, -1.4),
  new THREE.Vector3(4.15, 3.7, 1.4),
)

function fittingDistance(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  direction: THREE.Vector3,
): number {
  const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize()
  const up = new THREE.Vector3().crossVectors(direction, right).normalize()
  const tangentVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const tangentHorizontal = tangentVertical * camera.aspect
  let distance = 2
  for (const x of [MACHINE_BOUNDS.min.x, MACHINE_BOUNDS.max.x]) {
    for (const y of [MACHINE_BOUNDS.min.y, MACHINE_BOUNDS.max.y]) {
      for (const z of [MACHINE_BOUNDS.min.z, MACHINE_BOUNDS.max.z]) {
        const corner = new THREE.Vector3(x, y, z).sub(target)
        const towardCamera = corner.dot(direction)
        distance = Math.max(
          distance,
          Math.abs(corner.dot(right)) / tangentHorizontal + towardCamera,
          Math.abs(corner.dot(up)) / tangentVertical + towardCamera,
        )
      }
    }
  }
  return distance * 1.09
}

export function createStudio(host: HTMLElement): BenderStudio {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#e9e9e4')
  scene.fog = new THREE.Fog('#e9e9e4', 28, 65)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.03
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'bender-canvas'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.touchAction = 'none'
  renderer.domElement.setAttribute('aria-label', '十六轴三维拉弯机，可拖动旋转视角并使用滚轮缩放')
  host.append(renderer.domElement)

  const environment = createEnvironment(renderer)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.74

  const camera = new THREE.PerspectiveCamera(32, 1, 0.04, 150)
  camera.position.set(-5.5, 4, 7)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.3, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.minDistance = 1.1
  controls.maxDistance = 36
  controls.minPolarAngle = 0.001
  controls.maxPolarAngle = Math.PI * 0.495
  controls.screenSpacePanning = true
  controls.rotateSpeed = 0.65
  controls.zoomSpeed = 0.75

  const world = new THREE.Group()
  world.name = 'machine-z-up'
  world.rotation.x = -Math.PI / 2
  scene.add(world)

  const studioObjects = new THREE.Group()
  studioObjects.name = 'studio-set'
  scene.add(studioObjects)

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: '#e9e9e4', roughness: 0.97, metalness: 0, envMapIntensity: 0.18,
  })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.012
  floor.receiveShadow = true
  studioObjects.add(floor)

  const contactTexture = createContactTexture()
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 3.8),
    new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, toneMapped: false }),
  )
  contact.rotation.x = -Math.PI / 2
  contact.position.set(0.05, -0.009, 0)
  studioObjects.add(contact)

  const grid = new THREE.GridHelper(14, 28, 0xaaaead, 0xc5c8c4)
  grid.position.y = -0.006
  grid.visible = false
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
  gridMaterials.forEach((material) => {
    material.transparent = true
    material.opacity = 0.28
    material.depthWrite = false
  })
  studioObjects.add(grid)

  const key = new THREE.DirectionalLight(0xfff6e9, 2.3)
  key.position.set(-3.5, 8, 5)
  key.target.position.set(0, 1.1, 0)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.bias = -0.0002
  key.shadow.normalBias = 0.012
  key.shadow.radius = 4
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: 0.5, far: 24 })
  key.shadow.camera.updateProjectionMatrix()
  studioObjects.add(key, key.target)

  const rim = new THREE.DirectionalLight(0xdce9ff, 0.85)
  rim.position.set(4.5, 5, -4)
  studioObjects.add(rim)
  studioObjects.add(new THREE.HemisphereLight(0xffffff, 0xb8b8ae, 0.65))

  type CameraTransition = {
    start: number
    positionFrom: THREE.Vector3
    positionTo: THREE.Vector3
    targetFrom: THREE.Vector3
    targetTo: THREE.Vector3
  }
  let transition: CameraTransition | undefined
  let selectedView: StudioView | undefined = 'reference'
  let disposed = false
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const defaultTarget = new THREE.Vector3(0, 1.3, 0)

  const setCamera = (position: THREE.Vector3, target: THREE.Vector3, animate = true) => {
    if (!animate || reducedMotion.matches) {
      transition = undefined
      camera.position.copy(position)
      controls.target.copy(target)
      controls.update()
      return
    }
    transition = {
      start: performance.now(),
      positionFrom: camera.position.clone(),
      positionTo: position.clone(),
      targetFrom: controls.target.clone(),
      targetTo: target.clone(),
    }
  }

  const frame = (name: StudioView, animate: boolean) => {
    const direction = CAMERA_DIRECTIONS[name]
    const distance = fittingDistance(camera, defaultTarget, direction)
    const position = defaultTarget.clone().addScaledVector(direction, distance)
    setCamera(position, defaultTarget, animate)
  }

  const resize = () => {
    if (disposed) return
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    if (selectedView) frame(selectedView, false)
  }

  const onInteraction = () => {
    transition = undefined
    selectedView = undefined
  }
  controls.addEventListener('start', onInteraction)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  return {
    scene, renderer, camera, controls, world, grid,
    render() {
      if (disposed) return
      if (transition) {
        const t = Math.min((performance.now() - transition.start) / 420, 1)
        const eased = t * t * (3 - 2 * t)
        camera.position.lerpVectors(transition.positionFrom, transition.positionTo, eased)
        controls.target.lerpVectors(transition.targetFrom, transition.targetTo, eased)
        if (t >= 1) transition = undefined
      }
      controls.update()
      renderer.render(scene, camera)
    },
    resize,
    view(name) {
      if (disposed) return
      selectedView = name
      frame(name, true)
    },
    focus(pointMachine) {
      if (disposed) return
      selectedView = undefined
      world.updateWorldMatrix(true, false)
      const target = world.localToWorld(pointMachine.clone())
      const offset = camera.position.clone().sub(controls.target)
      offset.setLength(Math.min(Math.max(offset.length(), 3.4), 6.5))
      setCamera(target.clone().add(offset), target)
    },
    dispose() {
      if (disposed) return
      disposed = true
      observer.disconnect()
      controls.removeEventListener('start', onInteraction)
      controls.dispose()
      studioObjects.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      key.shadow.dispose()
      contactTexture.dispose()
      environment.dispose()
      scene.environment = null
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
