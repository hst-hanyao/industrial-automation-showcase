import { useEffect, type RefObject } from 'react'

export function usePageMeta(
  title: string,
  headingRef: RefObject<HTMLHeadingElement | null>,
  focusDelayMs = 0,
) {
  useEffect(() => {
    document.title = `${title} — 工业自动化能力图谱`
    const initialFocus = document.activeElement

    const focusTimer = window.setTimeout(() => {
      // Route autofocus must not take focus back after the visitor starts reading code.
      if (document.activeElement !== initialFocus && document.activeElement !== document.body) return
      headingRef.current?.focus({ preventScroll: true })
    }, focusDelayMs)

    return () => window.clearTimeout(focusTimer)
  }, [focusDelayMs, headingRef, title])
}
