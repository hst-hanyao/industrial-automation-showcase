import { describe, expect, it, vi } from 'vitest'
import { createDraftStorage } from './draft-storage'

describe('PLC architecture drafts', () => {
  it('does not access or overwrite drafts in the public view', () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() } as unknown as Storage
    const getStorage = vi.fn(() => storage)
    const drafts = createDraftStorage(getStorage, false)
    expect(drafts.read('old-draft')).toBeNull()
    expect(() => drafts.write('old-draft', 'new')).toThrow()
    expect(getStorage).not.toHaveBeenCalled()
  })

  it('reads old keys and explicitly saves only in maintenance mode', () => {
    const values = new Map([['old-draft', 'original']])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } as unknown as Storage
    const drafts = createDraftStorage(() => storage, true)
    expect(drafts.read('old-draft')).toBe('original')
    drafts.write('new-draft', 'edited')
    expect(values.get('old-draft')).toBe('original')
    expect(drafts.read('new-draft')).toBe('edited')
  })
})
