import { describe, expect, it } from 'vitest'
import {
  capabilities,
  capabilityIds,
  evidenceLabels,
  getCapability,
  getCapabilityNeighbors,
} from './capabilities'
import { engineeringCases } from './engineering-cases'
import { SITE_DESCRIPTION } from './site-config'

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

  it('labels the PLC page as a control case source review', () => {
    const plc = getCapability('plc')
    expect(plc.title).toContain('多任务控制案例复盘')
    expect(plc.sections.every((section) => section.kind !== 'project')).toBe(true)
  })

  it('labels the offline HALCON workbench as project evidence', () => {
    const vision = getCapability('vision')
    expect(vision.sections.find((section) => section.id === 'halcon-direction')?.kind).toBe('project')
  })

  it('uses all three evidence labels without capability ratings or prohibited wording', () => {
    expect(Object.values(evidenceLabels)).toEqual([
      '项目实践',
      '控制案例复盘',
      '设计说明',
    ])

    const publicCopy = JSON.stringify({ capabilities, engineeringCases, SITE_DESCRIPTION })
    for (const forbidden of [
      '专家',
      '精通',
      '能力百分比',
      '客户交付',
      '待核实',
      '官方案例',
      '引用文件',
      '引用的文件',
      '参考资料',
      '参考文献',
      '依据文件',
    ]) {
      expect(publicCopy).not.toContain(forbidden)
    }
  })
})

