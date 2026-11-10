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
    // An explicit URL override is a presentation control: it must stay stable
    // even when the operating system changes its motion preference mid-session.
    if (readExplicitMotionMode(window.location.search)) return

    const mediaQuery = window.matchMedia(reducedMotionQuery)
    const onChange = (event: MediaQueryListEvent) => {
      setMode(resolveMotionMode(event.matches))
    }

    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  return <MotionContext.Provider value={mode}>{children}</MotionContext.Provider>
}
