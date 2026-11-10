export type MotionMode = 'full' | 'reduced'

export const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
export const reducedMotionOverride = 'motion=reduced'
export const fullMotionOverride = 'motion=full'

/** An explicit URL override is a presentation control, not an accessibility override. */
export function readExplicitMotionMode(search: string): MotionMode | null {
  const requested = new URLSearchParams(search).get('motion')
  if (requested === 'full') return 'full'
  if (requested === 'reduced') return 'reduced'
  return null
}

export function resolveMotionMode(reduceMotion: boolean): MotionMode {
  return reduceMotion ? 'reduced' : 'full'
}

export function shouldReduceMotion(mediaMatches: boolean, search: string): boolean {
  const explicit = readExplicitMotionMode(search)
  if (explicit) return explicit === 'reduced'
  return mediaMatches
}
