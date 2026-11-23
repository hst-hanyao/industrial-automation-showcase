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

export interface CounterToken {
  readonly prefix: string
  readonly suffix: string
  readonly value: number
  readonly padLength: number
  readonly decimals: number
  readonly isSmallIndex: boolean
}

/** Parses a numeric telemetry token (e.g. "01", "99.8%", "4ms") for counter animation. */
export function parseCounterToken(text: string): CounterToken | null {
  const match = text.trim().match(/^([^\d+-]*[+-]?)(\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null

  const prefix = match[1] ?? ''
  const numText = match[2] ?? ''
  const suffix = match[3] ?? ''
  if (!numText) return null

  const value = Number.parseFloat(numText)
  if (!Number.isFinite(value)) return null

  const dotIndex = numText.indexOf('.')
  const decimals = dotIndex >= 0 ? numText.length - dotIndex - 1 : 0
  return {
    prefix,
    suffix,
    value,
    padLength: dotIndex >= 0 ? 0 : numText.length,
    decimals,
    isSmallIndex: decimals === 0 && numText.length <= 2 && value <= 20,
  }
}

/** Formats an interpolated counter step (0..1 progress) while preserving zero-padding & affixes. */
export function formatCounterStep(token: CounterToken, progress: number): string {
  const clamped = Math.min(1, Math.max(0, progress))
  if (token.isSmallIndex && clamped < 0.72) {
    const shown = Math.floor(Math.random() * 9) + 1
    return `${token.prefix}${String(shown).padStart(token.padLength, '0')}${token.suffix}`
  }

  const eased = 1 - Math.pow(1 - clamped, 3)
  const current = token.value * eased
  const formatted = token.decimals === 0
    ? String(Math.round(current)).padStart(token.padLength, '0')
    : current.toFixed(token.decimals)
  return `${token.prefix}${formatted}${token.suffix}`
}
