import { describe, expect, it } from 'vitest'
import { armBaseOffsets, armLengths, cycleDuration, handoffGateTime, insertionClearance, poseOfRobot, railLimits, sampleCycle, stages, stationLiftClearance, stationState, stations, type RobotId, type StationId } from './kinematics'

const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('single-wafer dry/wet handling teaching cycle', () => {
  it('starts and finishes with exactly the same dry wafer inside FOUP', () => {
    for (const time of [0, cycleDuration]) {
      const state = sampleCycle(time)
      expect(state.wafer.location).toEqual({ kind: 'station', station: 'FOUP' })
      expect(state.wafer.condition).toBe('dry')
      expect(state.wafer.position).toEqual(stations.FOUP.position)
      expect(Object.values(state.robots).flatMap(robot => Object.values(robot.bladePoses)).filter(arm => arm.gripping)).toHaveLength(0)
    }
  })

  it('gives each transfer a unique take and release at the stationary support plane', () => {
    const picks = stages.filter(stage => stage.action === '取片确认')
    const places = stages.filter(stage => stage.id.endsWith('-place'))
    expect(picks).toHaveLength(7)
    expect(places).toHaveLength(7)
    for (const stage of [...picks, ...places]) {
      const before = sampleCycle(stage.start + stage.duration * 0.49)
      const after = sampleCycle(stage.start + stage.duration * 0.51)
      expect(before.wafer.location.kind).toBe(stage.id.endsWith('-pick') ? 'station' : 'blade')
      expect(after.wafer.location.kind).toBe(stage.id.endsWith('-pick') ? 'blade' : 'station')
      expect(distance(before.wafer.position, after.wafer.position)).toBeLessThan(1e-10)
    }
  })

  it('retains front-blade ownership while the handoff permission is pending', () => {
    const state = sampleCycle(handoffGateTime)
    expect(state.stage.action).toBe('等待交接许可')
    expect(state.wafer.location).toEqual({ kind: 'blade', robot: 'front', blade: 'dry' })
    expect(stationState(state, 'HANDOFF_IN').occupied).toBe(false)
    expect(state.robots.rear.gripping).toBe(false)
  })

  it('never duplicates a wafer between a station and either robot end', () => {
    for (let i = 0; i <= 3000; i++) {
      const state = sampleCycle(cycleDuration * i / 3000)
      const held = Object.values(state.robots).flatMap(robot => Object.values(robot.bladePoses)).filter(arm => arm.gripping).length
      const occupied = (Object.keys(stations) as StationId[]).filter(id => stationState(state, id).occupied).length
      expect(held + occupied).toBe(1)
      if (state.wafer.location.kind === 'blade') {
        const location = state.wafer.location
        expect(state.wafer.position).toEqual(state.robots[location.robot].bladePoses[location.blade].endPosition)
      }
    }
  })

  it('keeps wet wafers away from front robot, dry ends, dry ports and FOUP', () => {
    let sawWet = false
    for (let i = 0; i <= 3000; i++) {
      const state = sampleCycle(cycleDuration * i / 3000)
      if (state.wafer.condition !== 'wet') continue
      sawWet = true
      if (state.wafer.location.kind === 'blade') {
        expect(state.wafer.location).toEqual({ kind: 'blade', robot: 'rear', blade: 'wet' })
      } else {
        expect(['APT', 'PLT', 'SRD']).toContain(state.wafer.location.station)
      }
    }
    expect(sawWet).toBe(true)
    const srd = stages.find(stage => stage.id === 'srd-process')!
    expect(sampleCycle(srd.end - 0.00001).wafer.condition).toBe('wet')
    expect(sampleCycle(srd.end).wafer.condition).toBe('dry')
  })

  it('preserves independently parked dry and wet arms and solves both IK chains inside their rail limits', () => {
    for (let i = 0; i <= 2500; i++) {
      const state = sampleCycle(cycleDuration * i / 2500)
      for (const id of ['front', 'rear'] as RobotId[]) {
        const robot = poseOfRobot(state, id)
        expect(robot.railX).toBeGreaterThanOrEqual(railLimits[id][0] - 1e-10)
        expect(robot.railX).toBeLessThanOrEqual(railLimits[id][1] + 1e-10)
        for (const blade of ['dry', 'wet'] as const) {
          const arm = robot.bladePoses[blade]
          const pivotX = robot.railX + armBaseOffsets[id][blade]
          const [a, b] = armLengths
          expect(Math.hypot(arm.endPosition.x - pivotX, arm.endPosition.z)).toBeLessThanOrEqual(a + b + 1e-10)
          const x = pivotX + a * Math.cos(arm.shoulderAngle) + b * Math.cos(arm.shoulderAngle + arm.elbowAngle)
          const z = a * Math.sin(arm.shoulderAngle) + b * Math.sin(arm.shoulderAngle + arm.elbowAngle)
          expect(distance(arm.endPosition, { x, y: arm.liftY, z })).toBeLessThan(1e-10)
        }
      }
    }
  })

  it('has continuous wafer and arm positions across every stage including dry/wet arm changes', () => {
    for (const stage of stages.slice(1)) {
      const before = sampleCycle(stage.start - 1e-6)
      const after = sampleCycle(stage.start + 1e-6)
      expect(distance(before.wafer.position, after.wafer.position), stage.id).toBeLessThan(0.00001)
      for (const id of ['front', 'rear'] as RobotId[]) {
        for (const blade of ['dry', 'wet'] as const) {
          const armBefore = before.robots[id].bladePoses[blade]
          const armAfter = after.robots[id].bladePoses[blade]
          expect(distance(armBefore.endPosition, armAfter.endPosition), stage.id).toBeLessThan(0.00001)
          expect(Math.abs(armBefore.shoulderAngle - armAfter.shoulderAngle), stage.id).toBeLessThan(0.00001)
          expect(Math.abs(armBefore.elbowAngle - armAfter.elbowAngle), stage.id).toBeLessThan(0.00001)
        }
      }
    }
  })

  it('keeps the gate shut and all ends clear during each active station process', () => {
    for (const stage of stages.filter(item => item.processStation && item.processStation !== 'FOUP')) {
      const state = sampleCycle(stage.start + stage.duration * 0.5)
      const status = stationState(state, stage.processStation!)
      expect(status.occupied).toBe(true)
      expect(status.processing).toBe(true)
      expect(status.clamped).toBe(true)
      expect(status.gateOpen).toBe(false)
      expect(state.activeRobot).toBe('none')
      expect(state.interlocks.transferClear).toBe(true)
    }
  })

  it('keeps both ends retracted during every carriage move, including handoff clearance', () => {
    const carriageStages = stages.filter(stage => ['沿轨定位', '沿轨搬运', '让出交接区域'].includes(stage.action))
    for (const stage of carriageStages) {
      for (const progress of [0, 0.25, 0.5, 0.75, 1 - 1e-6]) {
        const state = sampleCycle(stage.start + stage.duration * progress)
        for (const id of ['front', 'rear'] as RobotId[]) {
          const robot = state.robots[id]
          for (const blade of ['dry', 'wet'] as const) {
            const arm = robot.bladePoses[blade]
            const pivotX = robot.railX + armBaseOffsets[id][blade]
            expect(Math.hypot(arm.endPosition.x - pivotX, arm.endPosition.z), stage.id).toBeCloseTo(0.2, 10)
            expect(arm.liftY, stage.id).toBeGreaterThanOrEqual(1.2 - 1e-10)
          }
        }
      }
    }
  })

  it('never has two ends inside the same shared handoff access area', () => {
    for (let i = 0; i <= 3500; i++) {
      const state = sampleCycle(cycleDuration * i / 3500)
      for (const port of ['HANDOFF_IN', 'HANDOFF_OUT'] as const) {
        const target = stations[port].position
        const ends = [state.robots.front.bladePoses.dry, ...Object.values(state.robots.rear.bladePoses)]
        const entering = ends.filter(arm => Math.hypot(arm.endPosition.x - target.x, arm.endPosition.z - target.z) < 0.25)
        expect(entering.length, `${state.stage.id} ${port}`).toBeLessThanOrEqual(1)
      }
    }
    for (const [clearId, nextId] of [['front-handoff-handoff-clear', 'rear-load-locate'], ['rear-unload-handoff-clear', 'front-return-locate']] as const) {
      expect(stages.find(stage => stage.id === clearId)!.end).toBeLessThanOrEqual(stages.find(stage => stage.id === nextId)!.start)
    }
  })

  it('inserts and withdraws empty forks below each supported wafer instead of lifting through it', () => {
    for (let i = 0; i <= 3500; i++) {
      const state = sampleCycle(cycleDuration * i / 3500)
      if (state.wafer.location.kind !== 'station') continue
      const wafer = state.wafer.position
      const ends = [state.robots.front.bladePoses.dry, ...Object.values(state.robots.rear.bladePoses)]
      for (const arm of ends) {
        if (Math.hypot(arm.endPosition.x - wafer.x, arm.endPosition.z - wafer.z) < 0.14) {
          expect(arm.gripping).toBe(false)
          expect(arm.endPosition.y, state.stage.id).toBeLessThanOrEqual(wafer.y + 1e-10)
        }
      }
    }
    for (const stage of stages.filter(item => item.id.endsWith('-reach-source') || item.id.endsWith('-exit'))) {
      const state = sampleCycle(stage.start + stage.duration * 0.5)
      const station = stage.id.endsWith('-reach-source') ? stage.from! : stage.to!
      expect(state.robots[stage.activeRobot as RobotId].bladePoses[stage.activeBlade as 'dry' | 'wet'].liftY).toBeCloseTo(stations[station].position.y - insertionClearance, 10)
    }
  })

  it('enters and leaves the selected FOUP slot with a short lift instead of crossing neighbouring slots', () => {
    for (let i = 0; i <= 3500; i++) {
      const state = sampleCycle(cycleDuration * i / 3500)
      if (state.wafer.location.kind !== 'blade') continue
      const wafer = state.wafer.position
      if (Math.hypot(wafer.x - stations.FOUP.position.x, wafer.z - stations.FOUP.position.z) < 0.25) {
        expect(wafer.y, state.stage.id).toBeGreaterThanOrEqual(stations.FOUP.position.y - 1e-10)
        expect(wafer.y, state.stage.id).toBeLessThanOrEqual(stations.FOUP.position.y + stationLiftClearance + 1e-10)
      }
    }
  })

  it('separates independently lifted rear shoulder housings and parks their forks on opposite sides', () => {
    // Geometry uses 78 mm radius actuator housings; distinct X centres prevent
    // the two independently moving Z axes from passing through a shared shaft.
    expect(armBaseOffsets.rear.wet - armBaseOffsets.rear.dry).toBeGreaterThan(0.078 * 2)
    for (const stage of stages.filter(item => item.id.endsWith('-park-end') && item.activeRobot === 'rear')) {
      const state = sampleCycle(stage.end - 1e-6)
      const arm = state.robots.rear.bladePoses[stage.activeBlade as 'dry' | 'wet']
      expect(arm.endPosition.z).toBeCloseTo(stage.activeBlade === 'dry' ? -0.2 : 0.2, 6)
    }
  })

  it('can seek backwards deterministically and clamps invalid times without carrying state', () => {
    const time = cycleDuration * 0.73
    const expected = sampleCycle(time)
    sampleCycle(cycleDuration)
    sampleCycle(0)
    expect(sampleCycle(time)).toEqual(expected)
    expect(sampleCycle(-100)).toEqual(sampleCycle(0))
    expect(sampleCycle(Number.NaN)).toEqual(sampleCycle(0))
    expect(sampleCycle(cycleDuration + 100)).toEqual(sampleCycle(cycleDuration))
    expected.wafer.position.x = 999
    expected.robots.rear.bladePoses.wet.endPosition.x = 999
    expect(sampleCycle(time).wafer.position.x).not.toBe(999)
    expect(sampleCycle(time).robots.rear.bladePoses.wet.endPosition.x).not.toBe(999)
  })
})
