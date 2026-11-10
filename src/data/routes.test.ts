import { describe, expect, it } from 'vitest'
import { isShowcaseRoute, showcaseRoutePaths } from './routes'

describe('route manifest', () => {
  it('contains the homepage, capability map, four capabilities, PLC case, and cases', () => {
    expect(showcaseRoutePaths).toEqual([
      '/',
      '/capabilities',
      '/hmi',
      '/plc',
      '/plc/case',
      '/motion',
      '/vision',
      '/cases',
    ])
  })

  it('rejects routes outside the agreed site map', () => {
    expect(isShowcaseRoute('/motion')).toBe(true)
    expect(isShowcaseRoute('/cases')).toBe(true)
    expect(isShowcaseRoute('/electrical')).toBe(false)
    expect(isShowcaseRoute('/unknown')).toBe(false)
  })
})
