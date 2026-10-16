import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { buildBender, type BenderModel } from './geometry'
import {
  AXES, AXIS_IDS, DIMENSIONS, FRAME_IDS, computeFrames, zeroPose,
  type AxisId, type AxisValues, type Pose, type Side,
} from './kinematics'

const MIRROR_X = new THREE.Matrix4().makeScale(-1, 1, 1)
const MIRROR_Y = new THREE.Matrix4().makeScale(1, -1, 1)

/**
 * A reflection changes a rotation's axial vector by det(S) S. At the right
 * head S=mirrorY in its local coordinates: swing(Y) keeps its sign, while
 * heading(Z) and chuck(X) reverse. Its local X extension keeps its sign.
 * The two pre-head X slides and bed Z rotation use the mirrorX convention.
 */
function reflectedPose(left: AxisValues): Pose {
  return {
    left: { ...left },
    right: {
      lower: -left.lower, upper: -left.upper, bend: -left.bend,
      z: left.z, swing: left.swing, heading: -left.heading,
      stretch: left.stretch, chuck: -left.chuck,
    },
  }
}

function expectVector(actual: THREE.Vector3, expected: readonly [number, number, number], digits = 6): void {
  expect(actual.x).toBeCloseTo(expected[0], digits)
  expect(actual.y).toBeCloseTo(expected[1], digits)
  expect(actual.z).toBeCloseTo(expected[2], digits)
}

function expectSameMatrix(actual: THREE.Matrix4, expected: THREE.Matrix4): void {
  actual.elements.forEach((value, index) => expect(value).toBeCloseTo(expected.elements[index]!, 9))
}

function worldOrigin(node: THREE.Object3D): THREE.Vector3 {
  return new THREE.Vector3().setFromMatrixPosition(node.matrixWorld)
}

function requiredObject(model: BenderModel, name: string): THREE.Object3D {
  const node = model.root.getObjectByName(name)
  if (!node) throw new Error(`Missing assembly: ${name}`)
  return node
}

function requiredInstances(model: BenderModel, name: string): THREE.InstancedMesh {
  const node = requiredObject(model, name)
  if (!(node instanceof THREE.InstancedMesh)) throw new Error(`Expected instanced chain: ${name}`)
  return node
}

/** Same nearest-valid-axis parent walk used for actual raycast hits in main. */
function pickedAxis(hit: THREE.Object3D): { axis: unknown; side: unknown } {
  let node: THREE.Object3D | null = hit
  while (node && !(AXIS_IDS as readonly string[]).includes(String(node.userData.axis))) node = node.parent
  return { axis: node?.userData.axis, side: node?.userData.side }
}

function instanceOrigin(mesh: THREE.InstancedMesh, index: number): THREE.Vector3 {
  const matrix = new THREE.Matrix4()
  mesh.getMatrixAt(index, matrix)
  return new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld.clone().multiply(matrix))
}

function applyPose(model: BenderModel, pose: Pose): void {
  for (const side of ['left', 'right'] as const) {
    const n = model.sides[side]
    const q = pose[side]
    const inward = side === 'left' ? 1 : -1
    n.lower.position.x = (side === 'left' ? DIMENSIONS.leftBaseX : DIMENSIONS.rightBaseX) + q.lower / 1000
    n.bend.position.x = inward * DIMENSIONS.bendPivotInsetX
    n.bend.rotation.z = THREE.MathUtils.degToRad(q.bend)
    n.upper.position.x = -inward * DIMENSIONS.bendPivotInsetX + q.upper / 1000
    n.z.position.z = DIMENSIONS.carriageZ + q.z / 1000
    n.swing.rotation.y = THREE.MathUtils.degToRad(q.swing)
    n.heading.rotation.z = THREE.MathUtils.degToRad(q.heading)
    n.stretch.position.x = DIMENSIONS.sliderX + q.stretch / 1000
    n.chuck.rotation.x = THREE.MathUtils.degToRad(q.chuck)
  }
  model.root.updateMatrixWorld(true)
  model.updateDetails()
  model.root.updateMatrixWorld(true)
}

function checkLogicalFrames(model: BenderModel, pose: Pose): void {
  for (const side of ['left', 'right'] as const) {
    const expected = computeFrames(side, pose[side])
    for (const id of FRAME_IDS) expectSameMatrix(model.sides[side][id].matrixWorld, expected[id])
    expectSameMatrix(model.sides[side].mirror.matrixWorld, expected.frame)
    for (const node of Object.values(model.sides[side])) {
      expect(node.scale.toArray()).toEqual([1, 1, 1])
      expect(node.matrixWorld.determinant()).toBeCloseTo(1, 9)
    }
  }
}

function sideMeshes(model: BenderModel, side: Side): Map<string, THREE.Mesh> {
  const meshes = new Map<string, THREE.Mesh>()
  model.root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !node.name.startsWith(`${side}:`)) return
    const key = node.name.replace(`${side}:`, 'side:')
    if (meshes.has(key)) throw new Error(`Ambiguous assembly name: ${key}`)
    meshes.set(key, node)
  })
  return meshes
}

/** Compare every vertex and every chain instance, not just matching centres. */
function checkReflectedGeometry(model: BenderModel): void {
  const left = sideMeshes(model, 'left')
  const right = sideMeshes(model, 'right')
  expect(left.size).toBeGreaterThan(50)
  expect([...right.keys()].sort()).toEqual([...left.keys()].sort())
  const instanceLeft = new THREE.Matrix4()
  const instanceRight = new THREE.Matrix4()
  const worldLeft = new THREE.Matrix4()
  const worldRight = new THREE.Matrix4()
  const vertexLeft = new THREE.Vector3()
  const vertexRight = new THREE.Vector3()
  let checked = 0
  for (const [name, meshLeft] of left) {
    const meshRight = right.get(name)!
    const positionsLeft = meshLeft.geometry.getAttribute('position')
    const positionsRight = meshRight.geometry.getAttribute('position')
    expect(positionsRight.count, name).toBe(positionsLeft.count)
    const countLeft = meshLeft instanceof THREE.InstancedMesh ? meshLeft.count : 1
    const countRight = meshRight instanceof THREE.InstancedMesh ? meshRight.count : 1
    expect(countRight, name).toBe(countLeft)
    let largestError = 0
    for (let instance = 0; instance < countLeft; instance++) {
      if (meshLeft instanceof THREE.InstancedMesh) meshLeft.getMatrixAt(instance, instanceLeft)
      else instanceLeft.identity()
      if (meshRight instanceof THREE.InstancedMesh) meshRight.getMatrixAt(instance, instanceRight)
      else instanceRight.identity()
      worldLeft.multiplyMatrices(meshLeft.matrixWorld, instanceLeft)
      worldRight.multiplyMatrices(meshRight.matrixWorld, instanceRight)
      for (let vertex = 0; vertex < positionsLeft.count; vertex++) {
        vertexLeft.fromBufferAttribute(positionsLeft, vertex).applyMatrix4(worldLeft)
        vertexRight.fromBufferAttribute(positionsRight, vertex).applyMatrix4(worldRight)
        largestError = Math.max(largestError,
          Math.abs(vertexRight.x + vertexLeft.x),
          Math.abs(vertexRight.y - vertexLeft.y),
          Math.abs(vertexRight.z - vertexLeft.z))
        checked++
      }
    }
    expect(largestError, `${name}: mirrored world vertices`).toBeLessThan(0.00001)
  }
  expect(checked).toBeGreaterThan(100_000)
}

describe('the actual machine geometry preserves joint controls while mirroring visible assemblies', () => {
  let model: BenderModel

  beforeAll(() => { model = buildBender() })
  beforeEach(() => applyPose(model, zeroPose()))
  afterAll(() => model.dispose())

  it('keeps every zero-pose joint right-handed and at the original FK matrix', () => {
    checkLogicalFrames(model, zeroPose())
    expectVector(worldOrigin(model.sides.left.swing), [-1.35, 0, 1.45])
    expectVector(worldOrigin(model.sides.right.swing), [1.35, 0, 1.45])
    expectVector(worldOrigin(model.sides.left.grip), [-0.67, 0, 1.57])
    expectVector(worldOrigin(model.sides.right.grip), [0.67, 0, 1.57])
  })

  it.each(AXES)('preserves both sides of the existing $id control without reflecting the logical joint', axis => {
    const pose = zeroPose()
    pose.left[axis.id] = axis.unit === 'mm' ? 130 : 27
    pose.right[axis.id] = axis.unit === 'mm' ? -85 : -16
    applyPose(model, pose)
    checkLogicalFrames(model, pose)
  })

  it('keeps arbitrary independent compound positions equal to the unchanged FK', () => {
    const pose: Pose = {
      left: { lower: 120, upper: -80, bend: 23, z: 90, swing: 17, heading: -19, stretch: 140, chuck: 31 },
      right: { lower: 45, upper: -125, bend: 14, z: -60, swing: -11, heading: 21, stretch: 70, chuck: -45 },
    }
    applyPose(model, pose)
    checkLogicalFrames(model, pose)
  })

  it('places both swing motors on the same front side while preserving the true Y-axis pivots', () => {
    expectVector(worldOrigin(requiredObject(model, 'left:z:motor')), [-1.35, -0.39, 1.45])
    expectVector(worldOrigin(requiredObject(model, 'right:z:motor')), [1.35, -0.39, 1.45])
    expectVector(worldOrigin(model.sides.left.swing), [-1.35, 0, 1.45])
    expectVector(worldOrigin(model.sides.right.swing), [1.35, 0, 1.45])
  })

  it('mirrors lower motor X positions while keeping their depth and height equal', () => {
    expectVector(worldOrigin(requiredObject(model, 'left:lower:motor')), [-1.89, -0.40, 0.735])
    expectVector(worldOrigin(requiredObject(model, 'right:lower:motor')), [1.89, -0.40, 0.735])
  })

  it.each(['left', 'right'] as const)('resolves every %s motor surface to the joint it drives instead of the joint carrying its stator', side => {
    // The fixed support and driven joint differ for five of these six motors.
    // Keep this mapping independent of the geometry helper's actual metadata.
    const drivenAxes: Record<string, AxisId> = {
      lower: 'lower', bend: 'upper', frame: 'z',
      z: 'swing', swing: 'heading', heading: 'stretch',
    }
    const discovered: string[] = []
    model.root.traverse(node => {
      if (node.name.startsWith(`${side}:`) && node.name.endsWith(':motor')) discovered.push(node.name)
    })
    expect(discovered.sort()).toEqual(Object.keys(drivenAxes).map(support => `${side}:${support}:motor`).sort())
    for (const [support, actualAxis] of Object.entries(drivenAxes)) {
      const motor = requiredObject(model, `${side}:${support}:motor`)
      let surfaces = 0
      motor.traverse(node => {
        expect(pickedAxis(node), node.name).toEqual({ axis: actualAxis, side })
        if (node instanceof THREE.Mesh) surfaces++
      })
      expect(surfaces, motor.name).toBeGreaterThan(0)
    }
    const bendDrive = requiredObject(model, `${side}:bend-fixed-mount`)
    let bendSurfaces = 0
    bendDrive.traverse(node => {
      expect(pickedAxis(node), node.name).toEqual({ axis: 'bend', side })
      if (node instanceof THREE.Mesh) bendSurfaces++
    })
    expect(bendSurfaces).toBeGreaterThan(0)
  })

  it('keeps both lower chain fixed and mobile ends at the stated front-side positions', () => {
    const left = requiredInstances(model, 'left:lower-horizontal-energy-chain:articulated-links')
    const right = requiredInstances(model, 'right:lower-horizontal-energy-chain:articulated-links')
    expectVector(instanceOrigin(left, 0), [-2.30, -0.68, 0.67])
    expectVector(instanceOrigin(right, 0), [2.30, -0.68, 0.67])
    expectVector(instanceOrigin(left, left.count - 1), [-1.85, -0.68, 0.82])
    expectVector(instanceOrigin(right, right.count - 1), [1.85, -0.68, 0.82])
  })

  it('keeps upper chains behind the zero-pose guide and vertical chains at the same depth', () => {
    for (const side of ['left', 'right'] as const) {
      const upper = requiredInstances(model, `${side}:upper-horizontal-energy-chain:articulated-links`)
      expect(instanceOrigin(upper, 0).y).toBeCloseTo(0.26, 6)
      expect(instanceOrigin(upper, upper.count - 1).y).toBeCloseTo(0.26, 6)
      const vertical = requiredInstances(model, `${side}:frame:vertical-energy-chain`)
      for (let index = 0; index < vertical.count; index++) expect(instanceOrigin(vertical, index).y).toBeCloseTo(0.33, 6)
    }
  })

  it('places the fixed bend-motor housings on the same front side and preserves their centres under upper travel', () => {
    const centres = (side: Side) => {
      const mount = requiredObject(model, `${side}:bend-fixed-mount`)
      const housing = mount.children.find(node => node instanceof THREE.Mesh && !Array.isArray(node.material) && node.material.name === 'bender-graphite')
      if (!(housing instanceof THREE.Mesh)) throw new Error(`Missing ${side} bend housing`)
      housing.geometry.computeBoundingBox()
      return housing.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(housing.matrixWorld)
    }
    const left = centres('left')
    const right = centres('right')
    expect(left.y).toBeLessThan(-0.30)
    expectVector(right, [-left.x, left.y, left.z])
    const moved = zeroPose()
    moved.left.upper = 150
    moved.right.upper = -90
    applyPose(model, moved)
    expectVector(centres('left'), left.toArray() as [number, number, number])
    expectVector(centres('right'), right.toArray() as [number, number, number])
  })

  it('mirrors every actual side-mesh vertex and all articulated chain instances at photo zero', () => {
    checkReflectedGeometry(model)
  })

  it('matches the analytically derived reflected joint frames for a fully compound pose', () => {
    const pose = reflectedPose({ lower: 120, upper: -80, bend: 23, z: 90, swing: 17, heading: -19, stretch: 140, chuck: 31 })
    applyPose(model, pose)
    for (const id of FRAME_IDS) {
      const localReflection = ['lower', 'bend', 'upper'].includes(id) ? MIRROR_X : MIRROR_Y
      const expectedRight = MIRROR_X.clone().multiply(model.sides.left[id].matrixWorld).multiply(localReflection)
      expectSameMatrix(model.sides.right[id].matrixWorld, expectedRight)
    }
    checkLogicalFrames(model, pose)
  })

  it('mirrors every actual side-mesh vertex under all eight nonzero compound axis settings', () => {
    applyPose(model, reflectedPose({ lower: 120, upper: -80, bend: 23, z: 90, swing: 17, heading: -19, stretch: 140, chuck: 31 }))
    checkReflectedGeometry(model)
  })

  it('keeps visible locator anchors on mirrored physical features', () => {
    applyPose(model, reflectedPose({ lower: -60, upper: 110, bend: -18, z: -70, swing: -14, heading: 22, stretch: -120, chuck: -33 }))
    for (const anchor of model.anchors.filter(item => item.side === 'left')) {
      const peer = model.anchors.find(item => item.id === anchor.id.replace('left:', 'right:'))
      if (!peer) throw new Error(`Missing reflected locator: ${anchor.id}`)
      const left = anchor.node.localToWorld(anchor.local.clone())
      const right = peer.node.localToWorld(peer.local.clone())
      expectVector(right, [-left.x, left.y, left.z])
    }
  })
})
