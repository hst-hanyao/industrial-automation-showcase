import { useEffect, useState, type ReactNode } from 'react'
import {
  readExplicitMotionMode,
  reducedMotionQuery,
  resolveMotionMode,
  shouldReduceMotion,
} from '../../lib/motion'
import { MotionContext } from './motion-context'

interface MotionProviderProps {
  readonly children: ReactNode
}

function readInitialMode() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return resolveMotionMode(false)
  }
  return resolveMotionMode(
    shouldReduceMotion(
      window.matchMedia(reducedMotionQuery).matches,
      window.location.search,
    ),
  )
}

export function MotionProvider({ children }: MotionProviderProps) {
  const [mode, setMode] = useState(readInitialMode)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.motion = mode
  }, [mode])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    // An explicit URL override is a presentation control: it must stay stable
    // even when the operating system changes its motion preference mid-session.
    if (readExplicitMotionMode(window.location.search)) return

    const mediaQuery = window.matchMedia(reducedMotionQuery)
    const onChange = (event: MediaQueryListEvent) => {
      setMode(resolveMotionMode(event.matches))
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }
    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  return <MotionContext.Provider value={mode}>{children}</MotionContext.Provider>
}
