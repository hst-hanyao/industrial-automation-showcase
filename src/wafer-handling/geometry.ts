import * as THREE from 'three'
import { armBaseOffsets, stations, stationState, type Snapshot, type ArmPose, type StationId } from './kinematics'

/**
 * Independent teaching geometry. Only the 300 mm wafer is a dimensional anchor;
 * enclosure sizes, the 0.36 m links, clearances and fixtures are illustrative.
 * Two independent rear Z / theta / R mechanisms share one rail carriage. Their
 * separate dry and wet end effectors illustrate contamination segregation;
 * they are not a statement of any manufacturer's installed configuration.
 */

export type HandlingViewMode = 'all' | 'front' | 'rear'
export type HandlingAnchor = {
  id: string
  label: string
  object: THREE.Object3D
  zone: 'front' | 'rear'
}

const LINK = 0.36
const TAU = Math.PI * 2

export function createHandlingScene() {
  const group = new THREE.Group()
  group.name = 'Independent wafer handling teaching model'
  const front = new THREE.Group()
  const rear = new THREE.Group()
  front.name = 'Front dry wafer handling'
  rear.name = 'Rear process wafer handling'
  group.add(front, rear)
  const anchors: HandlingAnchor[] = []
  const resources: (THREE.BufferGeometry | THREE.Material)[] = []
  const zoneMaterials: Record<'front' | 'rear', THREE.MeshStandardMaterial[]> = { front: [], rear: [] }
  const baseOpacity = new Map<THREE.Material, number>()
  let labelsVisible = true
  let viewMode: HandlingViewMode = 'all'

  const materials = {
    white: new THREE.MeshStandardMaterial({ color: '#e7edf1', metalness: 0.18, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: '#a9bbc7', metalness: 0.75, roughness: 0.28 }),
    bright: new THREE.MeshStandardMaterial({ color: '#d3dee4', metalness: 0.78, roughness: 0.2 }),
    dark: new THREE.MeshStandardMaterial({ color: '#263744', metalness: 0.38, roughness: 0.45 }),
    seal: new THREE.MeshStandardMaterial({ color: '#182631', metalness: 0.08, roughness: 0.7 }),
    blue: new THREE.MeshStandardMaterial({ color: '#386fed', metalness: 0.3, roughness: 0.3 }),
    amber: new THREE.MeshStandardMaterial({ color: '#dc9632', metalness: 0.28, roughness: 0.3 }),
    copper: new THREE.MeshStandardMaterial({ color: '#b98b63', metalness: 0.7, roughness: 0.25 }),
    glass: new THREE.MeshStandardMaterial({ color: '#a9c8db', metalness: 0.06, roughness: 0.12, transparent: true, opacity: 0.16, depthWrite: false }),
    water: new THREE.MeshStandardMaterial({ color: '#5ca9c4', metalness: 0.18, roughness: 0.17, transparent: true, opacity: 0.65 }),
    wafer: new THREE.MeshStandardMaterial({ color: '#314963', metalness: 0.76, roughness: 0.2 }),
    waferGrid: new THREE.LineBasicMaterial({ color: '#8fa8c3', transparent: true, opacity: 0.42 }),
  }
  resources.push(...Object.values(materials))

  function zoneMaterial(material: THREE.MeshStandardMaterial, zone: 'front' | 'rear') {
    const key = `${zone}-${material.uuid}`
    const cached = group.userData[key] as THREE.MeshStandardMaterial | undefined
    if (cached) return cached
    const clone = material.clone()
    baseOpacity.set(clone, material.opacity)
    zoneMaterials[zone].push(clone)
    resources.push(clone)
    group.userData[key] = clone
    return clone
  }

  function mesh(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    resources.push(geometry)
    const object = new THREE.Mesh(geometry, material)
    object.name = name
    object.position.set(x, y, z)
    object.castShadow = !(material.transparent && material.opacity < 0.4)
    object.receiveShadow = true
    parent.add(object)
    return object
  }

  function box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D) {
    return mesh(name, new THREE.BoxGeometry(w, h, d), material, parent, x, y, z)
  }

  function cylinder(name: string, radius: number, height: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D, radiusTop = radius) {
    return mesh(name, new THREE.CylinderGeometry(radiusTop, radius, height, 40), material, parent, x, y, z)
  }

  function ring(name: string, radius: number, thickness: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D) {
    const object = mesh(name, new THREE.TorusGeometry(radius, thickness, 8, 48), material, parent, x, y, z)
    object.rotation.x = Math.PI / 2
    return object
  }

  function pipe(name: string, points: number[][], radius: number, material: THREE.Material, parent: THREE.Object3D) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x = 0, y = 0, z = 0]) => new THREE.Vector3(x, y, z)))
    return mesh(name, new THREE.TubeGeometry(curve, points.length * 5, radius, 6, false), material, parent)
  }

  function marker(id: string, label: string, x: number, y: number, z: number, zone: 'front' | 'rear', parent = group) {
    const object = new THREE.Object3D()
    object.name = `Label: ${label}`
    object.position.set(x, y, z)
    parent.add(object)
    anchors.push({ id, label, object, zone })
    return object
  }

  function screws(parent: THREE.Object3D, radius: number, y: number, material: THREE.Material, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = TAU * i / count
      cylinder('Socket cap fastener', 0.009, 0.008, Math.cos(angle) * radius, y, Math.sin(angle) * radius, material, parent)
    }
  }

  function baseCabinet(center: number, width: number, parent: THREE.Group, zone: 'front' | 'rear') {
    const white = zoneMaterial(materials.white, zone)
    const steel = zoneMaterial(materials.steel, zone)
    const dark = zoneMaterial(materials.dark, zone)
    const blue = zoneMaterial(materials.blue, zone)
    box('Rigid machine frame', width, 0.12, 1.76, center, 0.15, 0, dark, parent)
    box('Lower equipment cabinet', width - 0.025, 0.42, 1.68, center, 0.4, 0, white, parent)
    box('Containment work deck', width + 0.035, 0.065, 1.8, center, 0.645, 0, steel, parent)
    box('Deck removable liner', width - 0.04, 0.018, 1.72, center, 0.687, 0, white, parent)
    const panels = Math.max(2, Math.round(width / 0.7))
    const panelWidth = (width - 0.08) / panels
    for (let i = 0; i < panels; i++) {
      const x = center - (width - 0.08) / 2 + panelWidth * (i + 0.5)
      box('Service panel seam', 0.006, 0.33, 0.009, x - panelWidth / 2, 0.4, -0.847, dark, parent)
      box('Service door pull', 0.014, 0.095, 0.018, x + panelWidth * 0.29, 0.44, -0.858, steel, parent)
      box('Lower blue status strip', panelWidth - 0.02, 0.012, 0.009, x, 0.265, -0.85, blue, parent)
    }
    for (const x of [center - width / 2 + 0.12, center + width / 2 - 0.12]) {
      for (const z of [-0.7, 0.7]) {
        cylinder('Leveling foot', 0.075, 0.04, x, 0.025, z, dark, parent)
        cylinder('Threaded foot stem', 0.025, 0.11, x, 0.092, z, steel, parent)
      }
    }
  }

  baseCabinet(-1.16, 1.94, front, 'front')
  baseCabinet(1.34, 3.03, rear, 'rear')

  function linearRail(x0: number, x1: number, zone: 'front' | 'rear', parent: THREE.Group) {
    const steel = zoneMaterial(materials.steel, zone)
    const dark = zoneMaterial(materials.dark, zone)
    const bright = zoneMaterial(materials.bright, zone)
    const center = (x0 + x1) / 2
    box('Linear guide support beam', x1 - x0 + 0.3, 0.085, 0.27, center, 0.75, 0, dark, parent)
    for (const z of [-0.085, 0.085]) {
      box('Precision linear rail', x1 - x0 + 0.28, 0.035, 0.025, center, 0.808, z, bright, parent)
      for (let x = x0 - 0.05; x <= x1 + 0.06; x += 0.22) cylinder('Rail mounting bolt', 0.006, 0.004, x, 0.828, z, dark, parent)
    }
    box('Toothed rail drive belt', x1 - x0 + 0.18, 0.015, 0.028, center, 0.802, 0, dark, parent)
    for (const x of [x0 - 0.15, x1 + 0.15]) {
      box('Travel limit stop', 0.045, 0.085, 0.27, x, 0.79, 0, steel, parent)
      box('Rail support pedestal', 0.09, 0.09, 0.2, x, 0.705, 0, steel, parent)
    }
    return marker(`${zone}-rail`, zone === 'front' ? '前手臂 X 轴直线导轨' : '后手臂共用 X 轴轨道', center, 0.75, -0.24, zone)
  }
  linearRail(-1.7, -0.45, 'front', front)
  linearRail(0, 2.45, 'rear', rear)

  // A windowless transfer opening keeps both handoff stations visible. It is an
  // explanatory zone boundary, not a certified EFEM pressure enclosure.
  const partition = new THREE.Group()
  front.add(partition)
  for (const z of [-0.91, 0.91]) box('Transfer opening upright', 0.055, 0.98, 0.055, -0.14, 1.14, z, zoneMaterial(materials.steel, 'front'), partition)
  box('Transfer opening cross beam', 0.06, 0.065, 1.86, -0.14, 1.65, 0, zoneMaterial(materials.white, 'front'), partition)
  box('Transfer zone marker', 0.062, 0.018, 1.65, -0.14, 1.694, 0, zoneMaterial(materials.blue, 'front'), partition)

  type StationVisual = { group: THREE.Group; head?: THREE.Group; gate?: THREE.Mesh; rotor?: THREE.Group; lamp: THREE.Mesh; fluid?: THREE.Mesh; drops?: THREE.Group }
  const stationVisuals = {} as Record<StationId, StationVisual>

  function stand(id: StationId, zone: 'front' | 'rear') {
    const station = stations[id]
    const node = new THREE.Group()
    node.name = `${id}: ${station.label}`
    node.position.set(station.position.x, id === 'FOUP' || id === 'ALIGN' ? -0.055 : 0, station.position.z)
    ;(zone === 'front' ? front : rear).add(node)
    const white = zoneMaterial(materials.white, zone)
    const dark = zoneMaterial(materials.dark, zone)
    const steel = zoneMaterial(materials.steel, zone)
    const accent = zoneMaterial(id === 'PLT' ? materials.amber : materials.blue, zone)
    const side = station.position.z >= 0 ? 1 : -1
    box('Station support cabinet', 0.5, 0.22, 0.5, 0, 0.81, 0, white, node)
    box('Station mounting flange', 0.54, 0.035, 0.53, 0, 0.936, 0, steel, node)
    box('Station identification strip', 0.36, 0.027, 0.008, 0, 0.858, side * 0.254, accent, node)
    box('Fixture vertical service seam', 0.004, 0.15, 0.008, 0.14, 0.81, side * 0.254, dark, node)
    const lampMaterial = accent.clone()
    zoneMaterials[zone].push(lampMaterial)
    baseOpacity.set(lampMaterial, 1)
    resources.push(lampMaterial)
    const lamp = cylinder('Station status light', 0.014, 0.012, 0.205, 0.964, side * 0.205, lampMaterial, node)
    marker(id, station.label, 0, zone === 'rear' ? 1.92 : 1.53, side * 0.12, zone, node)
    const visual: StationVisual = { group: node, lamp }
    stationVisuals[id] = visual
    return { node, visual, white, dark, steel, accent }
  }

  {
    const { node, white, dark, steel } = stand('FOUP', 'front')
    // Cassette opening faces the front robot rail. Walls have actual thickness;
    // no vendor enclosure silhouette or downloaded product image is used.
    box('FOUP load port deck', 0.47, 0.03, 0.48, 0, 0.93, 0.04, steel, node)
    box('FOUP rear wall', 0.42, 0.36, 0.025, 0, 1.105, 0.19, white, node)
    for (const x of [-0.21, 0.21]) {
      box('FOUP cassette side wall', 0.025, 0.36, 0.35, x, 1.105, 0.025, zoneMaterial(materials.glass, 'front'), node)
      // Short lateral fingers reach beneath the wafer edge. The selected slot
      // (i = 1) has top Y = .950 m, matching stations.FOUP.position.y exactly.
      // Their narrow Z footprint leaves the oblique U-fork insertion corridor.
      for (let i = 0; i < 9; i++) box('Cassette wafer edge support', 0.1, 0.008, 0.03, Math.sign(x) * 0.1725, 0.97 + i * 0.031, 0, dark, node)
    }
    box('FOUP roof', 0.445, 0.025, 0.36, 0, 1.295, 0.025, white, node)
    box('Load port raised rear stop', 0.4, 0.045, 0.018, 0, 0.984, 0.225, dark, node)
    box('Cassette top carry handle', 0.13, 0.03, 0.05, 0, 1.325, 0.025, steel, node)
  }

  {
    const { node, steel, dark } = stand('ALIGN', 'front')
    cylinder('Aligner central bearing', 0.048, 0.065, 0, 0.9685, 0, dark, node)
    cylinder('Alignment vacuum chuck', 0.055, 0.008, 0, 1.001, 0, steel, node)
    ring('Aligner wafer outline', 0.157, 0.005, 0, 0.948, 0, steel, node)
    box('Optical notch detector support', 0.04, 0.12, 0.055, 0.195, 1.007, 0, steel, node)
    box('Optical notch detector fork', 0.05, 0.012, 0.055, 0.17, 1.069, 0, dark, node)
    box('Notch detector lower receiver', 0.05, 0.012, 0.055, 0.17, 1.025, 0, dark, node)
  }

  for (const id of ['HANDOFF_IN', 'HANDOFF_OUT'] as const) {
    const { node, dark, steel } = stand(id, 'front')
    cylinder('Handoff lift pedestal', 0.045, 0.105, 0, 0.9895, 0, steel, node)
    for (let i = 0; i < 3; i++) {
      const a = TAU * i / 3 + Math.PI / 2
      cylinder('Central three point wafer support', 0.009, 0.009, Math.cos(a) * 0.035, 1.0455, Math.sin(a) * 0.035, dark, node)
    }
    ring('Transfer nest outline', 0.165, 0.004, 0, 0.968, 0, steel, node)
  }

  for (const id of ['APT', 'PLT', 'SRD'] as const) {
    const { node, visual, white, dark, steel, accent } = stand(id, 'rear')
    const profile = [new THREE.Vector2(0.178, 0), new THREE.Vector2(0.232, 0), new THREE.Vector2(0.232, 0.047), new THREE.Vector2(0.222, 0.059), new THREE.Vector2(0.178, 0.059), new THREE.Vector2(0.178, 0)]
    mesh('Closed annular process bowl', new THREE.LatheGeometry(profile, 64), white, node, 0, 0.924, 0)
    cylinder('Recessed process well', 0.177, 0.018, 0, 0.946, 0, dark, node)
    ring('Process bowl upper flange', 0.204, 0.008, 0, 0.988, 0, steel, node)
    ring('Process bowl liner lip', 0.168, 0.005, 0, 0.985, 0, dark, node)
    screws(node, 0.205, 0.994, steel, 8)
    visual.fluid = cylinder('Qualitative process liquid surface', 0.171, 0.006, 0, 0.967, 0, zoneMaterial(materials.water, 'rear'), node)
    if (id !== 'SRD') {
      cylinder('Teaching central wafer support', 0.045, 0.075, 0, 1.0085, 0, steel, node)
      cylinder('Wafer support contact face', 0.052, 0.004, 0, 1.048, 0, dark, node)
    }
    for (const x of [-0.225, 0.225]) {
      cylinder('Head lifting column', 0.018, 0.82, x, 1.37, 0.20, steel, node)
      cylinder('Head column lower flange', 0.04, 0.018, x, 0.965, 0.20, dark, node)
    }
    box('Head bridge', 0.49, 0.065, 0.12, 0, 1.78, 0.20, white, node)
    const head = new THREE.Group()
    node.add(head)
    head.position.y = 1.56
    visual.head = head
    const headProfile = [new THREE.Vector2(0.115, -0.0275), new THREE.Vector2(0.185, -0.0275), new THREE.Vector2(0.185, 0.0275), new THREE.Vector2(0.115, 0.0275), new THREE.Vector2(0.115, -0.0275)]
    mesh('Annular teaching head with visible centre', new THREE.LatheGeometry(headProfile, 48), white, head)
    ring('Process head sealing lip', 0.16, 0.009, 0, -0.035, 0, dark, head)
    cylinder('Head spindle', 0.035, 0.055, 0, 0.05, 0, steel, head)
    box('Head cantilever support', 0.085, 0.045, 0.25, 0, 0.019, 0.11, steel, head)
    box('Head moving column cross carriage', 0.47, 0.045, 0.06, 0, 0.019, 0.20, steel, head)
    for (const x of [-0.225, 0.225]) cylinder('Moving head linear bearing', 0.027, 0.065, x, 0.019, 0.20, dark, head)
    box('Head accent tab', 0.12, 0.016, 0.035, 0, 0.037, -0.13, accent, head)
    // The access gate translates vertically out of the robot insertion opening.
    const gate = box('Retracting chamber access gate', 0.43, 0.19, 0.012, 0, 0.82, -0.245, zoneMaterial(materials.glass, 'rear'), node)
    visual.gate = gate
    for (const x of [-0.229, 0.229]) box('Gate guide', 0.014, 0.28, 0.025, x, 0.875, -0.245, steel, node)
    if (id !== 'PLT') {
      const drops = new THREE.Group()
      drops.name = 'Qualitative rinse markers, not flow calculation'
      visual.drops = drops
      node.add(drops)
      for (let i = 0; i < 8; i++) {
        const a = TAU * i / 8
        cylinder('Qualitative liquid marker', 0.004, 0.023, Math.cos(a) * 0.115, 1.07, Math.sin(a) * 0.115, zoneMaterial(materials.water, 'rear'), drops)
      }
      drops.visible = false
    }
    if (id === 'APT') {
      for (const x of [-0.125, 0.125]) {
        pipe('Prewet fluid inlet', [[x, 0.76, 0.27], [x, 0.91, 0.27], [x, 1.028, 0.14]], 0.01, accent, node)
      }
      ring('Prewet shower manifold', 0.128, 0.008, 0, -0.043, 0, steel, head)
      for (let i = 0; i < 8; i++) {
        const a = TAU * i / 8
        cylinder('Prewet distribution outlet', 0.007, 0.01, Math.cos(a) * 0.128, -0.049, Math.sin(a) * 0.128, accent, head)
      }
    }
    if (id === 'PLT') {
      ring('Illustrative cathode contact ring', 0.151, 0.006, 0, -0.044, 0, zoneMaterial(materials.copper, 'rear'), head)
      cylinder('Illustrative anode below wafer', 0.142, 0.01, 0, 0.965, 0, zoneMaterial(materials.copper, 'rear'), node)
      pipe('Electrolyte supply line', [[0.25, 0.75, 0.30], [0.25, 0.91, 0.30], [0.15, 0.995, 0.14]], 0.014, accent, node)
      pipe('Electrolyte return line', [[-0.15, 0.95, 0.15], [-0.26, 0.87, 0.29], [-0.26, 0.75, 0.29]], 0.014, steel, node)
    }
    if (id === 'SRD') {
      const rotor = new THREE.Group()
      rotor.position.y = 1.035
      node.add(rotor)
      visual.rotor = rotor
      cylinder('Spin chuck hub', 0.055, 0.024, 0, -0.005, 0, dark, rotor)
      for (let i = 0; i < 3; i++) {
        const angle = TAU * i / 3
        const blade = box('Spin chuck support spoke', 0.05, 0.012, 0.012, Math.cos(angle) * 0.025, 0, Math.sin(angle) * 0.025, steel, rotor)
        blade.rotation.y = -angle
        cylinder('Spin chuck support pad', 0.007, 0.012, Math.cos(angle) * 0.05, 0.009, Math.sin(angle) * 0.05, dark, rotor)
      }
      pipe('SRD rinse and dry delivery', [[0.23, 0.78, 0.24], [0.23, 1.11, 0.24], [0.12, 1.14, 0.10]], 0.009, accent, node)
    }
  }

  type ArmVisual = { joint: THREE.Group; elbow: THREE.Group; slider: THREE.Group; anchor: THREE.Object3D }
  type RobotVisual = { carriage: THREE.Group; dry: ArmVisual; wet?: ArmVisual }

  function buildRobot(zone: 'front' | 'rear'): RobotVisual {
    const parent = zone === 'front' ? front : rear
    const white = zoneMaterial(materials.white, zone)
    const steel = zoneMaterial(materials.steel, zone)
    const bright = zoneMaterial(materials.bright, zone)
    const dark = zoneMaterial(materials.dark, zone)
    const carriage = new THREE.Group()
    carriage.name = `${zone} rail carriage`
    parent.add(carriage)
    box('Rail carriage body', zone === 'rear' ? 0.46 : 0.28, 0.035, 0.30, 0, 0.846, 0, white, carriage)
    for (const z of [-0.085, 0.085]) box('Preloaded linear bearing block', 0.18, 0.035, 0.065, 0, 0.824, z, dark, carriage)
    const rearRobot = zone === 'rear'
    const mastZ = rearRobot ? 0.12 : -0.11
    box('Rigid vertical mast', rearRobot ? 0.4 : 0.14, 0.69, 0.11, 0, 1.18, mastZ, white, carriage)
    const verticalRails = rearRobot ? [-0.146, -0.074, 0.074, 0.146] : [-0.052, 0.052]
    for (const x of verticalRails) box('Independent vertical precision rail', 0.012, 0.61, 0.018, x, 1.18, mastZ - 0.065, bright, carriage)
    box('Z drive protective bellows', 0.075, 0.54, 0.022, 0, 1.16, mastZ + 0.067, dark, carriage)
    for (let i = 0; i < 17; i++) box('Bellows fold', 0.085, 0.006, 0.026, 0, 0.91 + i * 0.03, mastZ + 0.071, steel, carriage)

    function arm(blade: 'dry' | 'wet'): ArmVisual {
      const accent = zoneMaterial(blade === 'wet' ? materials.amber : materials.blue, zone)
      const slider = new THREE.Group()
      slider.name = `${zone} ${blade} independent Z slide`
      slider.position.x = armBaseOffsets[zone][blade]
      carriage.add(slider)
      const bracketZ = blade === 'wet' ? mastZ + 0.015 : mastZ - 0.015
      box('Independent Z bearing carriage', 0.16, 0.095, 0.045, 0, -0.05, bracketZ - 0.07, steel, slider)
      box('Cantilever shoulder bracket', 0.15, 0.045, Math.abs(mastZ) + 0.06, 0, -0.07, mastZ / 2, white, slider)
      cylinder('Shoulder rotary actuator housing', 0.078, 0.074, 0, -0.057, 0, dark, slider)
      cylinder('Shoulder actuator accent', 0.066, 0.012, 0, -0.014, 0, accent, slider)
      const joint = new THREE.Group()
      joint.position.y = -0.05
      slider.add(joint)
      cylinder('Shoulder output bearing', 0.055, 0.03, 0, 0.009, 0, bright, joint)
      box('First rigid arm link', LINK - 0.05, 0.038, 0.074, LINK / 2, 0.008, 0, steel, joint)
      box('First link inset stripe', LINK - 0.105, 0.005, 0.032, LINK / 2, 0.031, 0, accent, joint)
      cylinder('Elbow joint bearing lower', 0.061, 0.037, LINK, 0.011, 0, dark, joint)
      const elbow = new THREE.Group()
      elbow.position.set(LINK, 0.032, 0)
      joint.add(elbow)
      cylinder('Independent elbow output bearing', 0.052, 0.035, 0, 0, 0, bright, elbow)
      cylinder('Elbow top cover', 0.043, 0.009, 0, 0.023, 0, accent, elbow)
      // The wrist is 0.16 m behind the wafer centre. No pivot or arm shaft passes
      // through the wafer; an open U fork supports its underside from the side.
      box('Second link to offset wrist', LINK - 0.18, 0.014, 0.058, (LINK - 0.16) / 2, 0, 0, white, elbow)
      cylinder('Offset wrist bearing', 0.037, 0.018, LINK - 0.16, 0.002, 0, steel, elbow)
      box('Blade neck', 0.06, 0.012, 0.075, LINK - 0.12, -0.009, 0, dark, elbow)
      box('Fork root cross member', 0.028, 0.012, 0.19, LINK - 0.115, 0.007, 0, accent, elbow)
      for (const z of [-0.085, 0.085]) {
        box('Dry or wet wafer fork tine', 0.245, 0.01, 0.021, LINK + 0.007, 0.007, z, accent, elbow)
        for (const x of [LINK - 0.05, LINK + 0.09]) cylinder('Nonmetal wafer contact pad', 0.011, 0.006, x, 0.015, z, dark, elbow)
      }
      screws(joint, 0.036, 0.028, dark, 4)
      const anchor = marker(`${zone}-${blade}`, zone === 'front' ? '前手臂 · 干片末端' : `后手臂 · ${blade === 'dry' ? '干片' : '湿片'}独立末端`, LINK, 0.19, 0, zone, elbow)
      return { joint, elbow, slider, anchor }
    }

    const dry = arm('dry')
    const wet = rearRobot ? arm('wet') : undefined
    return { carriage, dry, wet }
  }

  const frontRobot = buildRobot('front')
  const rearRobot = buildRobot('rear')

  // A single moving wafer is positioned from the pure kinematic snapshot.
  const wafer = new THREE.Group()
  wafer.name = 'Single tracked 300 mm wafer'
  group.add(wafer)
  cylinder('Silicon wafer', 0.15, 0.004, 0, 0.002, 0, materials.wafer, wafer)
  cylinder('Illustrative copper underside', 0.149, 0.001, 0, -0.0008, 0, materials.copper, wafer)
  ring('Wafer bevel', 0.1494, 0.0009, 0, 0.0036, 0, materials.bright, wafer)
  const gridPoints: number[] = []
  for (let offset = -0.12; offset <= 0.121; offset += 0.025) {
    const extent = Math.sqrt(0.142 ** 2 - offset ** 2)
    gridPoints.push(-extent, 0.0045, offset, extent, 0.0045, offset, offset, 0.0045, -extent, offset, 0.0045, extent)
  }
  const gridGeometry = new THREE.BufferGeometry()
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3))
  resources.push(gridGeometry)
  wafer.add(new THREE.LineSegments(gridGeometry, materials.waferGrid))
  const wetHalo = ring('Wet wafer boundary cue', 0.157, 0.003, 0, 0.009, 0, materials.amber, wafer)
  wetHalo.visible = false

  function applyArm(visual: ArmVisual, pose: ArmPose) {
    visual.slider.position.y = pose.liftY
    visual.joint.rotation.y = -pose.shoulderAngle
    visual.elbow.rotation.y = -pose.elbowAngle
  }

  function update(snapshot: Snapshot) {
    const frontPose = snapshot.robots.front
    const rearPose = snapshot.robots.rear
    frontRobot.carriage.position.x = frontPose.railX
    rearRobot.carriage.position.x = rearPose.railX
    applyArm(frontRobot.dry, frontPose.bladePoses.dry)
    applyArm(rearRobot.dry, rearPose.bladePoses.dry)
    if (rearRobot.wet) applyArm(rearRobot.wet, rearPose.bladePoses.wet)
    wafer.position.set(snapshot.wafer.position.x, snapshot.wafer.position.y, snapshot.wafer.position.z)
    wetHalo.visible = snapshot.wafer.condition === 'wet'
    const spin = snapshot.stageProgress - Math.sin(TAU * snapshot.stageProgress) / TAU
    wafer.rotation.y = snapshot.stage.processStation === 'SRD' ? spin * TAU * 7 : snapshot.stage.processStation === 'ALIGN' ? spin * TAU : 0
    for (const id of Object.keys(stationVisuals) as StationId[]) {
      const visual = stationVisuals[id]
      const state = stationState(snapshot, id)
      if (visual.head) visual.head.position.y = state.clamped ? 1.095 : 1.56
      if (visual.gate) visual.gate.position.y = state.gateOpen ? 0.81 : 1.11
      if (visual.fluid) visual.fluid.visible = state.processing || (id !== 'SRD' && state.occupied)
      if (visual.rotor) visual.rotor.rotation.y = state.processing ? spin * TAU * 7 : 0
      if (visual.drops) {
        visual.drops.visible = state.processing && (id !== 'SRD' || snapshot.stageProgress < 0.45)
        visual.drops.position.y = state.processing ? -0.017 * ((snapshot.stageProgress * 12) % 1) : 0
      }
      visual.lamp.scale.setScalar(state.processing ? 1.3 : 1)
      const lampMaterial = visual.lamp.material as THREE.MeshStandardMaterial
      lampMaterial.emissive.copy(lampMaterial.color)
      lampMaterial.emissiveIntensity = state.processing ? 0.6 : state.occupied ? 0.18 : 0
    }
    for (const anchor of anchors) anchor.object.visible = labelsVisible && (viewMode === 'all' || anchor.zone === viewMode)
  }

  function setViewMode(mode: HandlingViewMode) {
    viewMode = mode
    for (const zone of ['front', 'rear'] as const) {
      const dimmed = mode !== 'all' && mode !== zone
      for (const material of zoneMaterials[zone]) {
        const opacity = baseOpacity.get(material) ?? 1
        material.opacity = dimmed ? Math.min(0.12, opacity) : opacity
        material.transparent = material.opacity < 1
        material.depthWrite = !dimmed && opacity >= 0.4
        material.needsUpdate = true
      }
      const node = zone === 'front' ? front : rear
      node.traverse(object => {
        if (object instanceof THREE.Mesh) object.castShadow = !dimmed && !(object.material instanceof THREE.Material && object.material.transparent && object.material.opacity < 0.4)
      })
    }
    for (const anchor of anchors) anchor.object.visible = labelsVisible && (mode === 'all' || anchor.zone === mode)
  }

  function setLabels(visible: boolean) {
    labelsVisible = visible
    for (const anchor of anchors) anchor.object.visible = visible && (viewMode === 'all' || anchor.zone === viewMode)
  }

  function dispose() {
    for (const resource of new Set(resources)) resource.dispose()
    group.clear()
  }

  return { group, anchors, update, setViewMode, setLabels, dispose, front, rear }
}
