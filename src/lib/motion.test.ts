import { describe, expect, it } from 'vitest'
import {
  fullMotionOverride,
  readExplicitMotionMode,
  reducedMotionOverride,
  reducedMotionQuery,
  resolveMotionMode,
  shouldReduceMotion,
} from './motion'

describe('reduced motion branch', () => {
  it('maps the media-query result to a stable mode', () => {
    expect(resolveMotionMode(true)).toBe('reduced')
    expect(resolveMotionMode(false)).toBe('full')
  })

  it('uses the operating-system reduced-motion query', () => {
    expect(reducedMotionQuery).toBe('(prefers-reduced-motion: reduce)')
  })

  it('supports a local-only browser verification override', () => {
    expect(reducedMotionOverride).toBe('motion=reduced')
    expect(shouldReduceMotion(false, '?motion=reduced')).toBe(true)
    expect(shouldReduceMotion(false, '')).toBe(false)
    expect(shouldReduceMotion(true, '')).toBe(true)
  })

  it('forces full motion for presentation even on a reduced-motion machine', () => {
    expect(fullMotionOverride).toBe('motion=full')
    expect(shouldReduceMotion(true, '?motion=full')).toBe(false)
    expect(readExplicitMotionMode('?motion=full')).toBe('full')
    expect(readExplicitMotionMode('?motion=reduced')).toBe('reduced')
    expect(readExplicitMotionMode('')).toBe(null)
    expect(readExplicitMotionMode('?motion=unknown')).toBe(null)
  })

  it('lets an explicit override win over the media query in both directions', () => {
    expect(shouldReduceMotion(false, '?motion=reduced')).toBe(true)
    expect(shouldReduceMotion(true, '?motion=full')).toBe(false)
  })
})
