import { useEffect, type RefObject } from 'react'
import { SITE_NAME } from '../data/site-config'

export function usePageMeta(
  title: string,
  headingRef: RefObject<HTMLHeadingElement | null>,
  focusDelayMs = 0,
) {
  useEffect(() => {
    document.title = title === SITE_NAME ? SITE_NAME : `${title} — ${SITE_NAME}`
    const initialFocus = document.activeElement

    const focusTimer = window.setTimeout(() => {
      // Route autofocus must not take focus back after the visitor starts reading code.
      if (document.activeElement !== initialFocus && document.activeElement !== document.body) return
      headingRef.current?.focus({ preventScroll: true })
    }, focusDelayMs)

    return () => window.clearTimeout(focusTimer)
  }, [focusDelayMs, headingRef, title])
}
