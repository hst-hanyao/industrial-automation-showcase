import { describe, expect, it } from 'vitest'
import { Matrix4, Vector3 } from 'three'
import {
  AXES, AXIS_IDS, FRAME_IDS, computeFrames, normalizePose, setAxis, zeroPose,
  type AxisId, type AxisValues, type Pose, type Side,
} from './kinematics'

function origin(matrix: Matrix4): Vector3 {
  return new Vector3().setFromMatrixPosition(matrix)
}

function direction(matrix: Matrix4, x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z).transformDirection(matrix)
}

function expectVector(actual: Vector3, expected: readonly [number, number, number]): void {
  expect(actual.x).toBeCloseTo(expected[0], 10)
  expect(actual.y).toBeCloseTo(expected[1], 10)
  expect(actual.z).toBeCloseTo(expected[2], 10)
}

function expectSameMatrix(actual: Matrix4, expected: Matrix4): void {
  actual.elements.forEach((value, index) => expect(value).toBeCloseTo(expected.elements[index]!, 10))
}

function axesWith(values: Partial<AxisValues> = {}): AxisValues {
  return { ...zeroPose().left, ...values }
}

describe('sixteen independent position values', () => {
  it('defines exactly the eight confirmed controls on each side', () => {
    expect(AXIS_IDS).toEqual(['lower', 'upper', 'bend', 'z', 'swing', 'heading', 'stretch', 'chuck'])
    expect(AXES.map(axis => axis.id)).toEqual(AXIS_IDS)
    expect(AXES.filter(axis => axis.unit === 'mm').map(axis => axis.id)).toEqual(['lower', 'upper', 'z', 'stretch'])
    expect(AXES.filter(axis => axis.unit === '°').map(axis => axis.id)).toEqual(['bend', 'swing', 'heading', 'chuck'])
  })

  it('starts all sixteen values at zero with no shared side state', () => {
    const first = zeroPose()
    const second = zeroPose()
    expect(Object.values(first.left)).toEqual(Array(8).fill(0))
    expect(Object.values(first.right)).toEqual(Array(8).fill(0))
    first.left.lower = 125
    expect(first.right.lower).toBe(0)
    expect(second.left.lower).toBe(0)
  })

  it.each(['left', 'right'] as const)('updates every %s control without changing another axis or side', side => {
    let pose = zeroPose()
    for (const [index, id] of AXIS_IDS.entries()) {
      const previous = pose
      const value = (index + 1) * 12.5
      pose = setAxis(previous, side, id, value)
      expect(pose[side][id]).toBe(value)
      expect(previous[side][id]).toBe(0)
      const other = side === 'left' ? 'right' : 'left'
      expect(pose[other]).toEqual(zeroPose()[other])
      for (const otherId of AXIS_IDS.filter(candidate => candidate !== id)) {
        expect(pose[side][otherId]).toBe(previous[side][otherId])
      }
      expect(pose.left).not.toBe(previous.left)
      expect(pose.right).not.toBe(previous.right)
    }
  })

  it('allows arbitrary finite input positions beyond illustrative slider ranges without clipping', () => {
    const pose = setAxis(zeroPose(), 'right', 'chuck', 721.25)
    expect(pose.right.chuck).toBe(721.25)
    expect(setAxis(pose, 'left', 'lower', -1275.5).left.lower).toBe(-1275.5)
  })

  it('restores every axis with a fresh zero pose after arbitrary independent settings', () => {
    let pose = zeroPose()
    for (const side of ['left', 'right'] as const) {
      for (const [index, id] of AXIS_IDS.entries()) pose = setAxis(pose, side, id, (index + 1) * 7)
    }
    expect(Object.values(pose.left).some(value => value !== 0)).toBe(true)
    pose = zeroPose()
    expect([...Object.values(pose.left), ...Object.values(pose.right)]).toEqual(Array(16).fill(0))
  })

  it('round trips all sixteen values through JSON without losing precision or signs', () => {
    const source: Pose = {
      left: axesWith({ lower: 123.75, upper: -56.125, bend: 22.5, z: 80, swing: -17, heading: 32, stretch: 25, chuck: 91 }),
      right: axesWith({ lower: -75, upper: 90, bend: -28.25, z: -50.5, swing: 11, heading: -7.5, stretch: -90, chuck: -125 }),
    }
    expect(normalizePose(JSON.parse(JSON.stringify(source)))).toEqual(source)
  })
})

describe('atomic validation', () => {
  it.each([null, [], 'pose', {}, { left: {} }, { left: {}, right: {} }])('rejects incomplete or nonobject state %j', input => {
    expect(() => normalizePose(input)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity, '25', null, true, undefined])('rejects invalid numeric values %j without mutating valid values', invalid => {
    const original = setAxis(zeroPose(), 'left', 'lower', 180)
    const before = JSON.stringify(original)
    const candidate = { left: { ...original.left }, right: { ...original.right, chuck: invalid } }
    expect(() => normalizePose(candidate)).toThrow(TypeError)
    expect(JSON.stringify(original)).toBe(before)
    expect(candidate.left.lower).toBe(180)
    expect(candidate.right.chuck).toBe(invalid)
  })

  it('requires every field to be supplied rather than inheriting hidden axis values', () => {
    const inherited = Object.create(axesWith()) as AxisValues
    expect(() => normalizePose({ left: inherited, right: axesWith() })).toThrow(TypeError)
  })

  it('copies a valid import before edits and ignores unrelated metadata', () => {
    const source = { ...zeroPose(), version: 1 }
    const result = normalizePose(source)
    result.left.stretch = 200
    expect(source.left.stretch).toBe(0)
    expect(Object.keys(result)).toEqual(['left', 'right'])
  })

  it('rejects invalid single-axis updates atomically', () => {
    const pose = zeroPose()
    expect(() => setAxis(pose, 'left', 'z', NaN)).toThrow(TypeError)
    expect(() => setAxis(pose, 'front' as Side, 'z', 10)).toThrow(TypeError)
    expect(() => setAxis(pose, 'left', 'unknown' as AxisId, 10)).toThrow(TypeError)
    expect(pose).toEqual(zeroPose())
  })

  it('rejects nonfinite values before generating world matrices', () => {
    expect(() => computeFrames('left', axesWith({ stretch: Infinity }))).toThrow(TypeError)
  })
})

describe('world frames and the confirmed mechanism hierarchy', () => {
  it('places zero-pose carriage heights and opposing inward-facing heads explicitly', () => {
    const left = computeFrames('left', axesWith())
    const right = computeFrames('right', axesWith())
    expectVector(origin(left.lower), [-1.35, 0, 0.76])
    expectVector(origin(left.bend), [-0.70, 0, 0.84])
    expectVector(origin(right.bend), [0.70, 0, 0.84])
    expectVector(origin(left.upper), [-1.35, 0, 0.93])
    expectVector(origin(right.upper), [1.35, 0, 0.93])
    expectVector(origin(left.frame), [-1.35, 0, 0.93])
    expectVector(origin(left.z), [-1.35, 0, 1.45])
    expectVector(origin(left.heading), [-1.35, 0, 1.57])
    expectVector(origin(left.grip), [-0.67, 0, 1.57])
    expectVector(origin(right.grip), [0.67, 0, 1.57])
    expectVector(direction(left.chuck, 1, 0, 0), [1, 0, 0])
    expectVector(direction(right.chuck, 1, 0, 0), [-1, 0, 0])
  })

  it.each(['left', 'right'] as const)('moves all %s parts along world +X with the lower slide, independent of head mirroring', side => {
    const before = computeFrames(side, axesWith({ bend: 25, swing: 20, heading: -12 }))
    const after = computeFrames(side, axesWith({ lower: 250, bend: 25, swing: 20, heading: -12 }))
    for (const id of FRAME_IDS) {
      const delta = origin(after[id]).sub(origin(before[id]))
      expectVector(delta, [0.25, 0, 0])
      expectVector(direction(after[id], 1, 0, 0), direction(before[id], 1, 0, 0).toArray() as [number, number, number])
    }
  })

  it('moves the upper slide and its children without moving the lower slide or the bend pivot', () => {
    const before = computeFrames('right', axesWith())
    const after = computeFrames('right', axesWith({ upper: -175 }))
    expectSameMatrix(after.lower, before.lower)
    expectSameMatrix(after.bend, before.bend)
    for (const id of FRAME_IDS.filter(id => id !== 'lower' && id !== 'bend')) {
      expectVector(origin(after[id]).sub(origin(before[id])), [-0.175, 0, 0])
    }
  })

  it('adds independent slide travels rather than replacing one with the other', () => {
    const frames = computeFrames('left', axesWith({ lower: 200, upper: -75 }))
    expectVector(origin(frames.lower), [-1.15, 0, 0.76])
    expectVector(origin(frames.upper), [-1.225, 0, 0.93])
    expectVector(origin(frames.grip), [-0.545, 0, 1.57])
  })

  it('carries the upper slide and complete frame around the inset pivot, leaving the lower slide fixed', () => {
    const before = computeFrames('left', axesWith())
    const after = computeFrames('left', axesWith({ bend: 90 }))
    expectSameMatrix(after.lower, before.lower)
    expectVector(origin(after.bend), [-0.70, 0, 0.84])
    expectVector(origin(after.upper), [-0.70, -0.65, 0.93])
    expectVector(direction(after.upper, 1, 0, 0), [0, 1, 0])
    expectVector(origin(after.frame), [-0.70, -0.65, 0.93])
    expectVector(direction(after.frame, 1, 0, 0), [0, 1, 0])
    expectVector(origin(after.grip), [-0.70, 0.03, 1.57])
  })

  it.each(['left', 'right'] as const)('turns the %s upper slide travel with the bend before applying the head mirror', side => {
    const before = computeFrames(side, axesWith({ bend: 90 }))
    const after = computeFrames(side, axesWith({ bend: 90, upper: 200 }))
    expectSameMatrix(after.lower, before.lower)
    expectSameMatrix(after.bend, before.bend)
    for (const id of ['upper', 'frame', 'z', 'swing', 'heading', 'stretch', 'chuck', 'grip'] as const) {
      expectVector(origin(after[id]).sub(origin(before[id])), [0, 0.2, 0])
    }
    expectVector(direction(after.upper, 1, 0, 0), [0, 1, 0])
    expectVector(direction(after.frame, 1, 0, 0), side === 'left' ? [0, 1, 0] : [0, -1, 0])
  })

  it('keeps the inset pivot and its lower-mounted motor reference fixed while the upper assembly sweeps around it', () => {
    const straight = computeFrames('left', axesWith({ upper: 200 }))
    const quarterTurn = computeFrames('left', axesWith({ upper: 200, bend: 90 }))
    const halfTurn = computeFrames('left', axesWith({ upper: 200, bend: 180 }))
    for (const frames of [straight, quarterTurn, halfTurn]) {
      expectVector(origin(frames.bend), [-0.70, 0, 0.84])
      expectVector(new Vector3(0.65, -0.28, 0.08).applyMatrix4(frames.lower), [-0.70, -0.28, 0.84])
    }
    expectVector(origin(straight.frame), [-1.15, 0, 0.93])
    expectVector(origin(quarterTurn.frame), [-0.70, -0.45, 0.93])
    expectVector(origin(halfTurn.frame), [-0.25, 0, 0.93])
  })

  it('mirrors the bend-pivot inset on the right without adding the head half-turn to the pivot frame', () => {
    const left = computeFrames('left', axesWith({ bend: 90 }))
    const right = computeFrames('right', axesWith({ bend: 90 }))
    expectVector(origin(right.bend), [0.70, 0, 0.84])
    expectVector(origin(right.frame), [0.70, 0.65, 0.93])
    expectVector(origin(right.grip), [0.70, -0.03, 1.57])
    expectVector(direction(right.bend, 1, 0, 0), [0, 1, 0])
    expectVector(direction(right.upper, 1, 0, 0), [0, 1, 0])
    expectVector(direction(right.frame, 1, 0, 0), [0, -1, 0])
    expectVector(origin(right.grip), [-origin(left.grip).x, -origin(left.grip).y, origin(left.grip).z])
  })

  it.each(['left', 'right'] as const)('makes the %s bend centre follow only lower travel, independently of upper travel and bend angle', side => {
    const first = computeFrames(side, axesWith({ lower: 120, upper: -250, bend: -37 }))
    const upperMoved = computeFrames(side, axesWith({ lower: 120, upper: 350, bend: -37 }))
    const lowerMoved = computeFrames(side, axesWith({ lower: -310, upper: 350, bend: -37 }))
    const bendTurned = computeFrames(side, axesWith({ lower: -310, upper: 350, bend: 55 }))
    expectVector(origin(first.bend), [side === 'left' ? -0.58 : 0.82, 0, 0.84])
    expectSameMatrix(upperMoved.bend, first.bend)
    expectSameMatrix(upperMoved.lower, first.lower)
    expectVector(origin(lowerMoved.bend), [side === 'left' ? -1.01 : 0.39, 0, 0.84])
    expectVector(origin(lowerMoved.bend).sub(origin(upperMoved.bend)), [-0.43, 0, 0])
    expectVector(origin(bendTurned.bend), [side === 'left' ? -1.01 : 0.39, 0, 0.84])
    expectSameMatrix(bendTurned.lower, lowerMoved.lower)
    expectVector(direction(bendTurned.lower, 1, 0, 0), [1, 0, 0])
  })

  it.each([
    { side: 'left', lower: 240, upper: 170, bend: 90, lowerX: -1.11, pivotX: -0.46, upperX: -0.46, upperY: -0.48, gripX: -0.46, gripY: 0.20 },
    { side: 'right', lower: -180, upper: 210, bend: -90, lowerX: 1.17, pivotX: 0.52, upperX: 0.52, upperY: -0.86, gripX: 0.52, gripY: -0.18 },
    { side: 'left', lower: -300, upper: -200, bend: 180, lowerX: -1.65, pivotX: -1.00, upperX: -0.15, upperY: 0, gripX: -0.83, gripY: 0 },
    { side: 'right', lower: 320, upper: -150, bend: 180, lowerX: 1.67, pivotX: 1.02, upperX: 0.52, upperY: 0, gripX: 1.20, gripY: 0 },
  ] as const)('matches independent planar coordinates for compound $side lower=$lower upper=$upper bend=$bend', expected => {
    const frames = computeFrames(expected.side, axesWith({ lower: expected.lower, upper: expected.upper, bend: expected.bend }))
    expectVector(origin(frames.lower), [expected.lowerX, 0, 0.76])
    expectVector(direction(frames.lower, 1, 0, 0), [1, 0, 0])
    expectVector(origin(frames.bend), [expected.pivotX, 0, 0.84])
    expectVector(origin(frames.upper), [expected.upperX, expected.upperY, 0.93])
    expectVector(origin(frames.frame), [expected.upperX, expected.upperY, 0.93])
    expectVector(origin(frames.grip), [expected.gripX, expected.gripY, 1.57])
  })

  it('lifts all carriage descendants but leaves the white column and its base unchanged', () => {
    const before = computeFrames('left', axesWith({ bend: 20 }))
    const after = computeFrames('left', axesWith({ bend: 20, z: 125 }))
    for (const id of ['lower', 'upper', 'bend', 'frame'] as const) expectSameMatrix(after[id], before[id])
    for (const id of ['z', 'swing', 'heading', 'stretch', 'chuck', 'grip'] as const) {
      expectVector(origin(after[id]).sub(origin(before[id])), [0, 0, 0.125])
    }
  })

  it('swings in local XZ around the motor centre and tilts the heading rotation plane', () => {
    const frames = computeFrames('left', axesWith({ swing: 90 }))
    expectVector(origin(frames.swing), [-1.35, 0, 1.45])
    expectVector(origin(frames.heading), [-1.23, 0, 1.45])
    expectVector(direction(frames.swing, 0, 1, 0), [0, 1, 0])
    expectVector(direction(frames.heading, 0, 0, 1), [1, 0, 0])
    expectVector(origin(frames.grip), [-1.23, 0, 0.77])
  })

  it('applies heading in the already-tilted local XY plane instead of world XY', () => {
    const frames = computeFrames('left', axesWith({ swing: 90, heading: 90 }))
    expectVector(origin(frames.heading), [-1.23, 0, 1.45])
    expectVector(direction(frames.heading, 0, 0, 1), [1, 0, 0])
    expectVector(direction(frames.heading, 1, 0, 0), [0, 1, 0])
    expectVector(origin(frames.grip), [-1.23, 0.68, 1.45])
  })

  it('keeps the guide and extension motor still during extension while moving slider and chuck', () => {
    const values = axesWith({ bend: 32, swing: 21, heading: -15 })
    const before = computeFrames('left', values)
    const after = computeFrames('left', { ...values, stretch: 160 })
    for (const id of ['lower', 'upper', 'bend', 'frame', 'z', 'swing', 'heading'] as const) {
      expectSameMatrix(after[id], before[id])
    }
    const expectedDelta = direction(before.heading, 1, 0, 0).multiplyScalar(0.16)
    for (const id of ['stretch', 'chuck', 'grip'] as const) {
      expectVector(origin(after[id]).sub(origin(before[id])), expectedDelta.toArray() as [number, number, number])
    }
  })

  it('rotates only the chuck around its own X axis without translating its centre or moving the slide', () => {
    const values = axesWith({ swing: 23, heading: 16, stretch: 75 })
    const before = computeFrames('left', values)
    const after = computeFrames('left', { ...values, chuck: 90 })
    for (const id of ['lower', 'upper', 'bend', 'frame', 'z', 'swing', 'heading', 'stretch'] as const) {
      expectSameMatrix(after[id], before[id])
    }
    expectVector(origin(after.chuck), origin(before.chuck).toArray() as [number, number, number])
    expectVector(origin(after.grip), origin(before.grip).toArray() as [number, number, number])
    expectVector(direction(after.chuck, 1, 0, 0), direction(before.chuck, 1, 0, 0).toArray() as [number, number, number])
    expect(direction(after.chuck, 0, 1, 0).distanceTo(direction(before.chuck, 0, 0, 1))).toBeCloseTo(0, 10)
  })

  it('composes all local rotations and distances in the specified order against an analytical 90-degree pose', () => {
    const frames = computeFrames('left', axesWith({ bend: 90, z: 100, swing: 90, heading: 90, stretch: 80, chuck: 45 }))
    expectVector(origin(frames.heading), [-0.70, -0.53, 1.55])
    expectVector(origin(frames.grip), [-1.46, -0.53, 1.55])
  })

  it('keeps left/right controls independent and mirrors the zero-configured geometry rather than axis values', () => {
    const pose = setAxis(zeroPose(), 'left', 'stretch', 200)
    expectVector(origin(computeFrames('left', pose.left).grip), [-0.47, 0, 1.57])
    expectVector(origin(computeFrames('right', pose.right).grip), [0.67, 0, 1.57])
    const sameTravel = computeFrames('right', axesWith({ stretch: 200 }))
    expectVector(origin(sameTravel.grip), [0.47, 0, 1.57])
  })

  it('returns fresh matrices without mutating the input pose or sharing frame storage', () => {
    const q = axesWith({ lower: 12, heading: 7 })
    const snapshot = { ...q }
    const first = computeFrames('left', q)
    const second = computeFrames('left', q)
    first.bend.setPosition(99, 99, 99)
    expect(q).toEqual(snapshot)
    expect(origin(first.frame).x).toBeCloseTo(-1.338)
    expect(origin(second.bend).x).toBeCloseTo(-0.688)
  })

  it('produces finite orthonormal rotations at all illustrative travel endpoints', () => {
    for (const side of ['left', 'right'] as const) {
      for (const endpoint of ['min', 'max'] as const) {
        const q = axesWith()
        for (const axis of AXES) q[axis.id] = axis[endpoint]
        const frames = computeFrames(side, q)
        for (const id of FRAME_IDS) {
          expect(frames[id].elements.every(Number.isFinite)).toBe(true)
          expect(frames[id].determinant()).toBeCloseTo(1, 10)
          const x = direction(frames[id], 1, 0, 0)
          const y = direction(frames[id], 0, 1, 0)
          expect(x.dot(y)).toBeCloseTo(0, 10)
        }
      }
    }
  })
})
