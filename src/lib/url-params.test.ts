import { describe, expect, it } from 'vitest'
import {
  isAllowedUrlParamValue,
  isKnownUrlParam,
  urlParamDefinitions,
} from './url-params'

describe('隐式 URL 参数白名单', () => {
  it('登记六个隐式参数及其取值说明', () => {
    expect(Object.keys(urlParamDefinitions)).toEqual([
      'edit', 'view', 'motion', 'film', 'pattern', 'teaching',
    ])
    for (const definition of Object.values(urlParamDefinitions)) {
      expect(definition.description.length).toBeGreaterThan(0)
      expect(definition.values.length).toBeGreaterThan(0)
    }
  })

  it.each([
    ['edit', '1'],
    ['view', 'architecture'],
    ['view', 'packml'],
    ['motion', 'full'],
    ['motion', 'reduced'],
    ['film', ''],
    ['pattern', 'tsv'],
    ['pattern', 'wlp'],
    ['teaching', '1'],
  ])('接受白名单内的 %s=%s', (key, value) => {
    expect(isAllowedUrlParamValue(key, value)).toBe(true)
  })

  it.each([
    ['edit', '0'],
    ['edit', 'true'],
    ['view', 'unknown'],
    ['view', ''],
    ['motion', 'auto'],
    ['motion', ''],
    ['pattern', 'xyz'],
    ['teaching', '0'],
    ['teaching', ''],
  ])('拒绝白名单外的 %s=%s', (key, value) => {
    expect(isAllowedUrlParamValue(key, value)).toBe(false)
  })

  it('拒绝未登记的参数名', () => {
    expect(isKnownUrlParam('edit')).toBe(true)
    expect(isKnownUrlParam('debug')).toBe(false)
    expect(isAllowedUrlParamValue('debug', '1')).toBe(false)
  })

  it('film 为存在性开关，不校验取值', () => {
    expect(isAllowedUrlParamValue('film', '')).toBe(true)
    expect(isAllowedUrlParamValue('film', '1')).toBe(true)
  })
})
