import { describe, expect, it } from 'vitest'
import {
  capabilities,
  capabilityIds,
  evidenceLabels,
  getCapability,
  getCapabilityNeighbors,
} from './capabilities'

describe('capability content model', () => {
  it('keeps the four agreed capability domains in order', () => {
    expect(capabilities.map((item) => item.id)).toEqual(capabilityIds)
    expect(capabilities.map((item) => item.route)).toEqual([
      '/hmi',
      '/plc',
      '/motion',
      '/vision',
    ])
  })

  it('keeps circular previous and next navigation', () => {
    expect(getCapabilityNeighbors('hmi').previous.id).toBe('vision')
    expect(getCapabilityNeighbors('hmi').next.id).toBe('plc')
    expect(getCapabilityNeighbors('vision').next.id).toBe('hmi')
  })

  it('labels the PLC page as an official case source review', () => {
    const plc = getCapability('plc')
    expect(plc.title).toContain('官方案例源码复盘')
    expect(plc.sections.every((section) => section.kind !== 'project')).toBe(true)
  })

  it('labels the offline HALCON workbench as project evidence', () => {
    const vision = getCapability('vision')
    expect(vision.sections.find((section) => section.id === 'halcon-direction')?.kind).toBe('project')
  })

  it('uses all three evidence labels without capability ratings', () => {
    expect(Object.values(evidenceLabels)).toEqual([
      '项目证据',
      '源码或案例复盘',
      '设计说明',
    ])

    const publicCopy = JSON.stringify(capabilities)
    for (const forbidden of ['专家', '精通', '能力百分比', '客户交付']) {
      expect(publicCopy).not.toContain(forbidden)
    }
  })
})

