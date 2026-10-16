import { Matrix4 } from 'three'

export const AXIS_IDS = [
  'lower', 'upper', 'bend', 'z', 'swing', 'heading', 'stretch', 'chuck',
] as const

export type AxisId = typeof AXIS_IDS[number]
export type Side = 'left' | 'right'
export type AxisValues = Record<AxisId, number>
export type Pose = Record<Side, AxisValues>

export interface AxisDefinition {
  id: AxisId
  label: string
  short: string
  unit: 'mm' | '°'
  min: number
  max: number
  step: number
  description: string
}

/** Slider ranges are illustrative travel ranges, not measured machine limits. */
export const AXES: readonly AxisDefinition[] = [
  { id: 'lower', label: '下层滑台', short: '下层', unit: 'mm', min: -450, max: 450, step: 1, description: '沿床身移动，带动拉弯电机、回转中心、上层滑台和整套机构。' },
  { id: 'upper', label: '上层滑台', short: '上层', unit: 'mm', min: -450, max: 450, step: 1, description: '沿拉弯后的局部导向移动，带动白色立架及其上机构，不带动拉弯回转中心和下层滑台。' },
  { id: 'bend', label: '拉弯轴', short: '拉弯', unit: '°', min: -55, max: 55, step: 1, description: '绕向设备中心内移的竖直回转中心，带动上层滑台及其全部机构在 XY 平面回转。' },
  { id: 'z', label: 'Z 轴', short: '升降', unit: 'mm', min: -250, max: 250, step: 1, description: '带动架上作业机构升降，白色立架不参与升降。' },
  { id: 'swing', label: '摆臂旋转', short: '摆臂', unit: '°', min: -55, max: 55, step: 1, description: '绕局部 Y 轴摆转，带动下级引申与夹头机构。' },
  { id: 'heading', label: '引申旋转', short: '转向', unit: '°', min: -55, max: 55, step: 1, description: '在随摆臂改变姿态的局部 XY 平面内，改变引申朝向。' },
  { id: 'stretch', label: '引申轴', short: '引申', unit: 'mm', min: -300, max: 300, step: 1, description: '滑块及夹头沿导轨直线移动，单动时电机与导轨不动。' },
  { id: 'chuck', label: '夹头旋转', short: '夹头', unit: '°', min: -180, max: 180, step: 1, description: '夹头绕自身局部 X 轴自转。' },
]

/** Approximate dimensions in metres, derived from the reference image. Z is up. */
export const DIMENSIONS = {
  leftBaseX: -1.35,
  rightBaseX: 1.35,
  lowerZ: 0.76,
  upperOffsetZ: 0.09,
  bendOffsetZ: 0.08,
  bendPivotInsetX: 0.65,
  carriageZ: 0.52,
  headingOffsetZ: 0.12,
  sliderX: 0.52,
  gripX: 0.16,
} as const

/**
 * Nominal joint offsets. The bend X offset is +inset on the left and -inset on
 * the right; the upper X offset cancels it at zero and adds the upper travel.
 * See computeFrames: lower -> bend -> upper -> initial mirror -> frame.
 */
export const JOINT_OFFSETS = {
  upper: [0, 0, DIMENSIONS.upperOffsetZ],
  bend: [0, 0, DIMENSIONS.bendOffsetZ],
  z: [0, 0, DIMENSIONS.carriageZ],
  heading: [0, 0, DIMENSIONS.headingOffsetZ],
  stretch: [DIMENSIONS.sliderX, 0, 0],
  grip: [DIMENSIONS.gripX, 0, 0],
} as const

export const FRAME_IDS = [
  'lower', 'upper', 'bend', 'frame', 'z', 'swing', 'heading', 'stretch', 'chuck', 'grip',
] as const
export type FrameId = typeof FRAME_IDS[number]
export type MachineFrames = Record<FrameId, Matrix4>

function zeroAxes(): AxisValues {
  return { lower: 0, upper: 0, bend: 0, z: 0, swing: 0, heading: 0, stretch: 0, chuck: 0 }
}

/** A fresh, unshared zero state on every call. All values are relative to the photo pose. */
export function zeroPose(): Pose {
  return { left: zeroAxes(), right: zeroAxes() }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} 必须是有限数值。`)
  }
  return value
}

function normalizeAxes(input: unknown, side: Side): AxisValues {
  if (!isRecord(input)) throw new TypeError(`${side} 缺少完整的八轴位置。`)
  const result = zeroAxes()
  for (const id of AXIS_IDS) {
    if (!Object.hasOwn(input, id)) throw new TypeError(`${side}.${id} 缺少轴位置。`)
    result[id] = finiteNumber(input[id], `${side}.${id}`)
  }
  return result
}

/**
 * Validate all sixteen values before returning a fresh state. No partial imports,
 * numeric-string conversion, silent defaults, or clipping to illustrative limits.
 */
export function normalizePose(input: unknown): Pose {
  if (!isRecord(input) || !Object.hasOwn(input, 'left') || !Object.hasOwn(input, 'right')) {
    throw new TypeError('姿态必须同时包含左右两侧的完整八轴位置。')
  }
  const left = normalizeAxes(input.left, 'left')
  const right = normalizeAxes(input.right, 'right')
  return { left, right }
}

/** Update one axis without mutating the previous pose or sharing its axis objects. */
export function setAxis(pose: Pose, side: Side, id: AxisId, value: number): Pose {
  if (side !== 'left' && side !== 'right') throw new TypeError('无效的设备侧别。')
  if (!(AXIS_IDS as readonly string[]).includes(id)) throw new TypeError('无效的轴名称。')
  finiteNumber(value, `${side}.${id}`)
  const next = normalizePose(pose)
  next[side][id] = value
  return next
}

const DEG_TO_RAD = Math.PI / 180

function translated(parent: Matrix4, x: number, y: number, z: number): Matrix4 {
  return parent.clone().multiply(new Matrix4().makeTranslation(x, y, z))
}

/**
 * World matrices, in metres and a Z-up coordinate system. The lower slide moves
 * along world +X. The bend pivot is inset toward the machine centre and carries
 * the upper slide, whose local +X travel follows the bend angle. An opposite
 * upper offset preserves the photo-zero frame/column position. The right head's
 * initial half-turn follows the upper slide, so it does not reverse slide travel.
 * `heading` is also the stationary guide/motor frame during extension-only moves.
 */
export function computeFrames(side: Side, input: AxisValues): MachineFrames {
  if (side !== 'left' && side !== 'right') throw new TypeError('无效的设备侧别。')
  const q = normalizeAxes(input, side)
  const baseX = side === 'left' ? DIMENSIONS.leftBaseX : DIMENSIONS.rightBaseX
  const pivotInset = (side === 'left' ? 1 : -1) * DIMENSIONS.bendPivotInsetX
  const lower = new Matrix4().makeTranslation(baseX + q.lower / 1000, 0, DIMENSIONS.lowerZ)
  const bend = translated(lower, pivotInset, 0, DIMENSIONS.bendOffsetZ)
    .multiply(new Matrix4().makeRotationZ(q.bend * DEG_TO_RAD))
  const upper = translated(bend, -pivotInset + q.upper / 1000, 0, DIMENSIONS.upperOffsetZ)
  const frame = upper.clone().multiply(new Matrix4().makeRotationZ(side === 'right' ? Math.PI : 0))
  const z = translated(frame, 0, 0, DIMENSIONS.carriageZ + q.z / 1000)
  const swing = z.clone().multiply(new Matrix4().makeRotationY(q.swing * DEG_TO_RAD))
  const heading = translated(swing, 0, 0, DIMENSIONS.headingOffsetZ)
    .multiply(new Matrix4().makeRotationZ(q.heading * DEG_TO_RAD))
  const stretch = translated(heading, DIMENSIONS.sliderX + q.stretch / 1000, 0, 0)
  const chuck = stretch.clone().multiply(new Matrix4().makeRotationX(q.chuck * DEG_TO_RAD))
  const grip = translated(chuck, DIMENSIONS.gripX, 0, 0)
  return { lower, upper, bend, frame, z, swing, heading, stretch, chuck, grip }
}
