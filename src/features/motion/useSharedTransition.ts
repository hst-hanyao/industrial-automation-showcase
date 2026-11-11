import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { preloadRoute } from '../../route-modules'
import { useMotionMode } from './useMotionMode'

const TRANSITION_NAME = 'capability-hero'

interface ViewTransitionApi {
  startViewTransition?: (
    callback: () => Promise<void> | void,
  ) => { finished: Promise<void> }
}

export function runSharedTransition(
  start: NonNullable<ViewTransitionApi['startViewTransition']>,
  source: HTMLElement,
  load: () => Promise<unknown> | undefined,
  navigate: () => void,
) {
  const root = document.documentElement
  root.classList.add('is-shared-transition')
  source.style.setProperty('view-transition-name', TRANSITION_NAME)

  const cleanup = () => {
    source.style.removeProperty('view-transition-name')
    root.classList.remove('is-shared-transition')
  }

  try {
    const transition = start.call(document, async () => {
      try {
        await load()
      } catch {
        // Navigate even when preloading fails: React.lazy can then surface the
        // loading error through the route error boundary and its reload action.
      }
      source.style.removeProperty('view-transition-name')
      flushSync(navigate)
      root.classList.remove('is-shared-transition')
    })
    void transition.finished.then(cleanup, cleanup)
  } catch {
    cleanup()
    navigate()
  }
}

/**
 * Morphs the clicked capability node into the destination hero.
 * The source name is cleared inside the update callback so the new snapshot
 * only ever has one element carrying `capability-hero`.
 * Falls back to a plain navigation when the API or motion is unavailable.
 */
export function useSharedTransition() {
  const navigate = useNavigate()
  const motionMode = useMotionMode()

  return useCallback((to: string, source: HTMLElement | null) => {
    const start = (document as unknown as ViewTransitionApi).startViewTransition
    if (motionMode === 'reduced' || !source || typeof start !== 'function') {
      navigate(to)
      return
    }

    runSharedTransition(start, source, () => preloadRoute(to), () => navigate(to))
  }, [navigate, motionMode])
}
