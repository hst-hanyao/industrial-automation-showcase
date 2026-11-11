import { afterEach, describe, expect, it, vi } from 'vitest'
import { runSharedTransition } from './useSharedTransition'

afterEach(() => vi.unstubAllGlobals())

describe('shared route transition', () => {
  it('navigates and clears transition state when preloading fails', async () => {
    const classes = new Set<string>()
    const names = new Map<string, string>()
    const root = { classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) } }
    const source = { style: { setProperty: (name: string, value: string) => names.set(name, value), removeProperty: (name: string) => names.delete(name) } } as unknown as HTMLElement
    vi.stubGlobal('document', { documentElement: root })
    const navigate = vi.fn()
    let finished: Promise<void> = Promise.resolve()
    const start = (callback: () => Promise<void> | void) => {
      finished = Promise.resolve(callback())
      return { finished }
    }

    runSharedTransition(start, source, () => Promise.reject(new Error('offline')), navigate)
    await finished
    await Promise.resolve()

    expect(navigate).toHaveBeenCalledOnce()
    expect(classes.size).toBe(0)
    expect(names.size).toBe(0)
  })
})
