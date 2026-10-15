/**
 * Single-wafer teaching cycle. Dimensions and durations are illustrative, not
 * vendor motion programs, recipes, safety validation, or measured throughput.
 * One authoritative location owns the wafer; rendering must use wafer.position.
 */
export type RobotId = 'front' | 'rear'
export type BladeId = 'dry' | 'wet'
export type StationId = 'FOUP' | 'ALIGN' | 'HANDOFF_IN' | 'HANDOFF_OUT' | 'APT' | 'PLT' | 'SRD'
export type WaferCondition = 'dry' | 'wet'
export interface Vec3 { x: number; y: number; z: number }
export interface Station { id: StationId; label: string; position: Vec3; zone: 'dry' | 'handoff' | 'wet' }
export type WaferLocation =
  | { kind: 'station'; station: StationId }
  | { kind: 'blade'; robot: RobotId; blade: BladeId }

export const stations: Record<StationId, Station> = {
  FOUP: { id: 'FOUP', label: 'FOUP 晶圆盒', position: { x: -1.7, y: 0.95, z: 0.65 }, zone: 'dry' },
  ALIGN: { id: 'ALIGN', label: '晶圆定向台', position: { x: -1.1, y: 0.95, z: -0.6 }, zone: 'dry' },
  HANDOFF_IN: { id: 'HANDOFF_IN', label: '入站干片交接位', position: { x: -0.45, y: 1.05, z: 0.55 }, zone: 'handoff' },
  HANDOFF_OUT: { id: 'HANDOFF_OUT', label: '出站干片交接位', position: { x: -0.45, y: 1.05, z: -0.55 }, zone: 'handoff' },
  APT: { id: 'APT', label: 'APT 预湿', position: { x: 0.55, y: 1.05, z: 0.58 }, zone: 'wet' },
  PLT: { id: 'PLT', label: 'PLT 电镀', position: { x: 1.5, y: 1.05, z: 0.58 }, zone: 'wet' },
  SRD: { id: 'SRD', label: 'SRD 清洗甩干', position: { x: 2.45, y: 1.05, z: 0.58 }, zone: 'wet' },
}

export const armLengths = [0.36, 0.36] as const
/** Independent rear shoulders are staggered along the shared rail carriage. */
export const armBaseOffsets: Record<RobotId, Record<BladeId, number>> = {
  front: { dry: 0, wet: 0 },
  rear: { dry: -0.11, wet: 0.11 },
}
/** Empty U forks enter below the supported wafer, then rise into contact. */
export const insertionClearance = 0.025
/** Short lift stays within the illustrative 31 mm cassette slot pitch. */
export const stationLiftClearance = 0.01
export const railLimits: Record<RobotId, readonly [number, number]> = {
  front: [-1.7, -0.45], rear: [0, 2.45],
}

export interface ArmPose {
  /** Y of the horizontal joint plane, equal to the wafer support plane. */
  liftY: number
  shoulderAngle: number
  elbowAngle: number
  endPosition: Vec3
  gripping: boolean
}
export interface RobotPose extends ArmPose {
  railX: number
  /** Last selected end persists while a process is running. */
  activeBlade: BladeId
  /** Rear handler has independently parked dry and wet joint/lift assemblies. */
  bladePoses: Record<BladeId, ArmPose>
}

export interface Stage {
  id: string
  label: string
  action: string
  responsibility: string
  activeRobot: RobotId | 'none'
  activeBlade: BladeId | 'none'
  start: number
  duration: number
  end: number
  from?: StationId
  to?: StationId
  port?: StationId
  processStation?: StationId
  interlock: string
}

export interface Snapshot {
  timeSeconds: number
  progress: number
  stageIndex: number
  stage: Stage
  stageProgress: number
  activeRobot: RobotId | 'none'
  activeBlade: BladeId | 'none'
  wafer: { location: WaferLocation; condition: WaferCondition; position: Vec3 }
  robots: Record<RobotId, RobotPose>
  interlocks: {
    dryWetSeparated: true
    waferSecured: boolean
    processActive: boolean
    transferClear: boolean
  }
}

interface ArmFrame { endPosition: Vec3; shoulderAngle: number; elbowAngle: number }
interface RobotFrame { railX: number; activeBlade: BladeId; arms: Record<BladeId, ArmFrame> }
interface Frame {
  robots: Record<RobotId, RobotFrame>
  location: WaferLocation
  condition: WaferCondition
}
interface MotionStage { stage: Stage; before: Frame; after: Frame; discreteAt: number; rotate?: BladeId }

const cloneVec = (v: Vec3): Vec3 => ({ ...v })
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) })
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const ease = (t: number) => t * t * (3 - 2 * t)
const nearAngle = (angle: number, reference: number) => reference + Math.atan2(Math.sin(angle - reference), Math.cos(angle - reference))

function solveArm(railX: number, endPosition: Vec3, reference = 0): ArmFrame {
  const x = endPosition.x - railX
  const z = endPosition.z
  const [a, b] = armLengths
  const radius = Math.hypot(x, z)
  // All authored paths are inside the reachable annulus. Clamping only absorbs
  // floating-point error, and tests separately assert actual reachability.
  const elbowAngle = Math.acos(clamp((radius * radius - a * a - b * b) / (2 * a * b), -1, 1))
  const shoulder = Math.atan2(z, x) - Math.atan2(b * Math.sin(elbowAngle), a + b * Math.cos(elbowAngle))
  return { endPosition: cloneVec(endPosition), shoulderAngle: nearAngle(shoulder, reference), elbowAngle }
}

function initialRobot(id: RobotId): RobotFrame {
  const railX = id === 'front' ? -1.7 : 0
  const dryX = railX + armBaseOffsets[id].dry
  const wetX = railX + armBaseOffsets[id].wet
  return {
    railX, activeBlade: 'dry',
    arms: {
      dry: solveArm(dryX, { x: dryX, y: id === 'front' ? 1.2 : 1.25, z: -0.2 }),
      wet: solveArm(wetX, { x: wetX, y: 1.36, z: 0.2 }),
    },
  }
}

const copyFrame = (frame: Frame): Frame => ({
  robots: {
    front: copyRobot(frame.robots.front),
    rear: copyRobot(frame.robots.rear),
  },
  location: { ...frame.location }, condition: frame.condition,
})
function copyRobot(robot: RobotFrame): RobotFrame {
  return {
    ...robot,
    arms: {
      dry: { ...robot.arms.dry, endPosition: cloneVec(robot.arms.dry.endPosition) },
      wet: { ...robot.arms.wet, endPosition: cloneVec(robot.arms.wet.endPosition) },
    },
  }
}

let cursor = 0
let current: Frame = {
  robots: { front: initialRobot('front'), rear: initialRobot('rear') },
  location: { kind: 'station', station: 'FOUP' }, condition: 'dry',
}
const sequence: MotionStage[] = []
type StageInput = Omit<Stage, 'start' | 'end'>

function append(input: StageInput, change?: (frame: Frame) => void, discreteAt = 0.5, rotate?: BladeId) {
  const before = copyFrame(current)
  const after = copyFrame(current)
  change?.(after)
  const stage: Stage = { ...input, start: cursor, end: cursor + input.duration }
  sequence.push({ stage, before, after, discreteAt, rotate })
  current = after
  cursor = stage.end
}

function moveEnd(frame: Frame, robot: RobotId, blade: BladeId, position: Vec3) {
  const state = frame.robots[robot]
  state.arms[blade] = solveArm(state.railX + armBaseOffsets[robot][blade], position, state.arms[blade].shoulderAngle)
}
function moveRail(frame: Frame, robot: RobotId, railX: number) {
  const state = frame.robots[robot]
  const dx = railX - state.railX
  state.railX = railX
  for (const blade of ['dry', 'wet'] as const) {
    const arm = state.arms[blade]
    arm.endPosition.x += dx
  }
}
const safeY = (robot: RobotId, blade: BladeId) => robot === 'front' ? 1.2 : blade === 'dry' ? 1.25 : 1.36
const railAt = (robot: RobotId, station: StationId) => clamp(stations[station].position.x, ...railLimits[robot])
const safeAt = (robot: RobotId, blade: BladeId, station: StationId): Vec3 => ({
  x: railAt(robot, station) + armBaseOffsets[robot][blade], y: safeY(robot, blade), z: Math.sign(stations[station].position.z) * 0.2,
})

function transfer(id: string, robot: RobotId, blade: BladeId, from: StationId, to: StationId, responsibility: string) {
  const source = stations[from].position
  const destination = stations[to].position
  const base = { activeRobot: robot, activeBlade: blade, from, to, responsibility } as const
  // Do not mutate the preceding stage's after-frame when selecting a different
  // end; both independently parked chains retain their world positions.
  current = copyFrame(current)
  current.robots[robot].activeBlade = blade
  const add = (phase: string, action: string, duration: number, interlock: string, change?: (f: Frame) => void, port?: StationId, discreteAt = 0.5, rotate?: BladeId) => {
    append({ ...base, id: `${id}-${phase}`, label: `${stations[from].label} → ${stations[to].label} · ${action}`, action, duration, interlock, port }, change, discreteAt, rotate)
  }
  add('locate', '沿轨定位', 1.4, '末端已回缩；交接区无人占用后才允许小车定位。', f => moveRail(f, robot, railAt(robot, from)))
  add('face-source', '转向取片位', 0.8, '在安全半径内转向；另一末端维持独立停车姿态。', f => moveEnd(f, robot, blade, safeAt(robot, blade, from)), undefined, 0.5, blade)
  add('lower-pick', '下降到插片高度', 0.7, '空叉先在回缩安全位下降到晶圆支撑面下方，避免从上方穿过晶圆。', f => moveEnd(f, robot, blade, { ...safeAt(robot, blade, from), y: source.y - insertionClearance }))
  add('reach-source', '低位伸入取片位', 1.2, '工艺已停止、头部抬起、站门打开；空叉从晶圆下方横向伸入。', f => moveEnd(f, robot, blade, { ...source, y: source.y - insertionClearance }), from)
  add('contact-pick', '升叉接触晶圆', 0.5, '空叉升到晶圆底面；站端仍持片，接触确认前不转移晶圆归属。', f => moveEnd(f, robot, blade, source), from)
  add('pick', '取片确认', 0.6, '末端持片确认后站端才释放；此处仅演示互锁顺序，不代表真实传感器。', f => { f.location = { kind: 'blade', robot, blade } }, from)
  add('lift', '短抬脱离支撑', 0.7, '持片确认后仅短抬脱离支撑；FOUP 内不得竖直跨越相邻槽层。', f => moveEnd(f, robot, blade, { ...source, y: source.y + stationLiftClearance }), from)
  add('retract', '低位回缩离站', 1.2, '保持短抬高度横向离站；晶圆完全退出后才允许继续升高。', f => moveEnd(f, robot, blade, { ...safeAt(robot, blade, from), y: source.y + stationLiftClearance }), from)
  add('raise-travel', '回缩后升至搬运高度', 0.6, '回缩确认后再升到搬运高度；两个末端均回缩才允许沿轨移动。', f => moveEnd(f, robot, blade, safeAt(robot, blade, from)))
  add('travel', '沿轨搬运', 1.8, blade === 'wet' ? '湿片由湿末端承载；禁止送往干片交接位或 FOUP。' : '干片由干末端承载；沿轨时保持末端回缩。', f => moveRail(f, robot, railAt(robot, to)))
  add('face-destination', '转向放片位', 0.8, '工位预约成功、目的位为空；在安全半径内转向。', f => moveEnd(f, robot, blade, safeAt(robot, blade, to)), undefined, 0.5, blade)
  add('lower-destination', '回缩位下降到放片高度', 0.7, '晶圆仍在回缩安全位时先降低；FOUP 放片禁止从盒内高处竖直跨槽下降。', f => moveEnd(f, robot, blade, { ...safeAt(robot, blade, to), y: destination.y + stationLiftClearance }))
  add('extend', '低位伸出到放片位', 1.2, '目的工艺头抬起、门打开；在支撑面上方短抬高度横向伸入。', f => moveEnd(f, robot, blade, { ...destination, y: destination.y + stationLiftClearance }), to)
  add('lower', '下降放片', 0.7, '到达支撑高度后才能放片；工艺启动仍被禁止。', f => moveEnd(f, robot, blade, destination), to)
  if (to === 'HANDOFF_IN') {
    add('gate', '等待交接许可', 1, '入站交接位必须就绪、目的位为空且后手臂已退出；条件未满足时前手臂继续持片，禁止释放。', undefined, to)
  }
  add('place', '放片确认', 0.6, '站端到片确认后末端才释放；晶圆所有权在此唯一转移。', f => { f.location = { kind: 'station', station: to } }, to)
  add('clear-lift', '空叉下降脱离', 0.6, '站端已接管晶圆，空叉先下降脱离底面，禁止向上穿过晶圆。', f => moveEnd(f, robot, blade, { ...destination, y: destination.y - insertionClearance }), to)
  add('exit', '低位退出工位', 1.2, '空叉在晶圆下方横向退出；交接位先出后入。', f => moveEnd(f, robot, blade, { ...safeAt(robot, blade, to), y: destination.y - insertionClearance }), to)
  add('raise-park', '回缩后升至安全高度', 0.6, '末端完全退出工位后才允许升高；工位可关闭并夹持晶圆。', f => moveEnd(f, robot, blade, safeAt(robot, blade, to)))
  add('park-end', '末端分区停车', 0.7, '两末端保持独立回缩停车姿态：干末端朝干侧、湿末端朝湿侧，避免共用插片路径。', f => moveEnd(f, robot, blade, { x: railAt(robot, to) + armBaseOffsets[robot][blade], y: safeY(robot, blade), z: blade === 'dry' ? -0.2 : 0.2 }), undefined, 0.5, blade)
  // Vacate the shared handoff boundary before the other robot approaches it.
  if (to === 'HANDOFF_IN' || to === 'HANDOFF_OUT') {
    add('handoff-clear', '让出交接区域', 0.9, '当前手臂退出共享交接区，另一手臂才获得进入许可。', f => moveRail(f, robot, robot === 'front' ? -1.1 : 0.55))
  }
}

function process(id: string, station: StationId, action: string, duration: number, responsibility: string, interlock: string, condition?: WaferCondition) {
  append({ id, label: `${stations[station].label} · ${action}`, action, duration, responsibility, activeRobot: 'none', activeBlade: 'none', processStation: station, interlock }, condition ? f => { f.condition = condition } : undefined, condition === 'dry' ? 1 : 0.25)
}

process('ready', 'FOUP', '装载就绪', 1.4, '前手臂管理晶圆盒侧干片；后手臂管理工艺侧转运。', '单片演示开始；FOUP 内为干片，两只手臂均在安全位。')
transfer('front-load', 'front', 'dry', 'FOUP', 'ALIGN', '前手臂：从 FOUP 取出干片，送定向台；不进入湿工艺区。')
process('align', 'ALIGN', '定向与确认', 2.4, '定向台完成示意性 notch 定向；前手臂等待完成信号。', '末端退出、晶圆夹持后才允许定向；完成后再开放取片。')
transfer('front-handoff', 'front', 'dry', 'ALIGN', 'HANDOFF_IN', '前手臂：将定向后的干片送入站交接位，然后退出。')
transfer('rear-load', 'rear', 'dry', 'HANDOFF_IN', 'APT', '后手臂干末端：接收干片并送入 APT；预湿后由湿末端接续。')
process('apt-process', 'APT', '预湿与排气', 4.5, 'APT 使表面进入湿态；这是后续干湿末端切换的边界。', '两末端退出、门关闭、夹持后启动；过程停止、头部抬起后才可取片。', 'wet')
transfer('rear-wet-apt-plt', 'rear', 'wet', 'APT', 'PLT', '后手臂湿末端：搬运预湿后的湿片，保持在湿工艺区。')
process('plt-process', 'PLT', '电镀过程示意', 5, 'PLT 演示电镀占位；不计算真实镀层、配方、电流或设备节拍。', '末端已退出、门关闭、夹持确认才允许工艺；完成后仍为湿片。')
transfer('rear-wet-plt-srd', 'rear', 'wet', 'PLT', 'SRD', '后手臂湿末端：将电镀后的湿片送 SRD 清洗甩干。')
process('srd-process', 'SRD', '清洗、甩干与干燥确认', 5, 'SRD 干燥完成后才把晶圆状态改为干片，开放干末端取片。', '清洗和甩干期间禁止取片；转速归零、干燥确认、头部抬起后才开放干片出口。', 'dry')
transfer('rear-unload', 'rear', 'dry', 'SRD', 'HANDOFF_OUT', '后手臂干末端：只在 SRD 干燥完成后取片，送出站干片交接位。')
transfer('front-return', 'front', 'dry', 'HANDOFF_OUT', 'FOUP', '前手臂：从出站交接位接收已干燥晶圆，送回 FOUP。')
process('complete', 'FOUP', '完整往返完成', 2, '一片晶圆完成前手臂、后手臂与干湿末端的完整职责交接。', 'FOUP 内为干片；所有末端已退出；可拖动时间轴复查每次取放。')

export const stages: readonly Stage[] = sequence.map(item => item.stage)
/** Illustrative animation seconds. This is not the equipment throughput. */
export const cycleDuration = cursor
/** Pause here to demonstrate a missing handoff-ready permission before release. */
export const handoffGateTime = (() => {
  const stage = stages.find(item => item.id === 'front-handoff-gate')!
  return stage.start + stage.duration * 0.5
})()

function interpolateRobot(id: RobotId, before: RobotFrame, after: RobotFrame, t: number, rotate: BladeId | undefined): RobotFrame {
  const railX = lerp(before.railX, after.railX, t)
  const arms = {} as Record<BladeId, ArmFrame>
  for (const blade of ['dry', 'wet'] as const) {
    const offset = armBaseOffsets[id][blade]
    const a = before.arms[blade]
    const b = after.arms[blade]
    let endPosition = mix(a.endPosition, b.endPosition, t)
    if (rotate === blade) {
      const thetaA = Math.atan2(a.endPosition.z, a.endPosition.x - before.railX - offset)
      const thetaB = nearAngle(Math.atan2(b.endPosition.z, b.endPosition.x - after.railX - offset), thetaA)
      const theta = lerp(thetaA, thetaB, t)
      const radius = lerp(Math.hypot(a.endPosition.x - before.railX - offset, a.endPosition.z), Math.hypot(b.endPosition.x - after.railX - offset, b.endPosition.z), t)
      endPosition = { x: railX + offset + radius * Math.cos(theta), y: lerp(a.endPosition.y, b.endPosition.y, t), z: radius * Math.sin(theta) }
    }
    arms[blade] = solveArm(railX + offset, endPosition, lerp(a.shoulderAngle, b.shoulderAngle, t))
  }
  return { railX, activeBlade: after.activeBlade, arms }
}

/** Random-access, deterministic sampling. Out-of-range times clamp to the ends. */
export function sampleCycle(timeSeconds: number): Snapshot {
  const time = Number.isFinite(timeSeconds) ? clamp(timeSeconds, 0, cycleDuration) : 0
  const stageIndex = Math.max(0, sequence.findIndex(item => time < item.stage.end))
  const index = time >= cycleDuration ? sequence.length - 1 : stageIndex
  const motion = sequence[index]!
  const stage = motion.stage
  const stageProgress = clamp((time - stage.start) / stage.duration, 0, 1)
  const eased = ease(stageProgress)
  const discrete = stageProgress >= motion.discreteAt ? motion.after : motion.before
  const location = { ...discrete.location }
  const frames: Record<RobotId, RobotFrame> = {
    front: interpolateRobot('front', motion.before.robots.front, motion.after.robots.front, eased, stage.activeRobot === 'front' ? motion.rotate : undefined),
    rear: interpolateRobot('rear', motion.before.robots.rear, motion.after.robots.rear, eased, stage.activeRobot === 'rear' ? motion.rotate : undefined),
  }
  const robots = {} as Record<RobotId, RobotPose>
  for (const robot of ['front', 'rear'] as const) {
    const frame = frames[robot]
    const bladePoses = {} as Record<BladeId, ArmPose>
    for (const blade of ['dry', 'wet'] as const) {
      const arm = frame.arms[blade]
      bladePoses[blade] = { ...arm, endPosition: cloneVec(arm.endPosition), liftY: arm.endPosition.y, gripping: location.kind === 'blade' && location.robot === robot && location.blade === blade }
    }
    robots[robot] = { ...bladePoses[frame.activeBlade], railX: frame.railX, activeBlade: frame.activeBlade, bladePoses }
  }
  const position = location.kind === 'station' ? cloneVec(stations[location.station].position) : cloneVec(robots[location.robot].bladePoses[location.blade].endPosition)
  return {
    timeSeconds: time, progress: time / cycleDuration, stageIndex: index, stage, stageProgress,
    activeRobot: stage.activeRobot, activeBlade: stage.activeBlade,
    wafer: { location, condition: discrete.condition, position }, robots,
    interlocks: { dryWetSeparated: true, waferSecured: true, processActive: Boolean(stage.processStation && stage.processStation !== 'FOUP'), transferClear: stage.activeRobot === 'none' },
  }
}

export const poseOfRobot = (snapshot: Snapshot, robot: RobotId): RobotPose => snapshot.robots[robot]

export function stationState(snapshot: Snapshot, id: StationId) {
  const occupied = snapshot.wafer.location.kind === 'station' && snapshot.wafer.location.station === id
  const processing = snapshot.stage.processStation === id && id !== 'FOUP'
  return {
    occupied, processing,
    gateOpen: snapshot.stage.port === id,
    clamped: occupied && processing,
    condition: occupied ? snapshot.wafer.condition : null,
  }
}
