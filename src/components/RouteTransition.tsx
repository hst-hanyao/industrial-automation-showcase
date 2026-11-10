import { useRef } from 'react'
import { useMotionMode } from '../features/motion/useMotionMode'
import { gsap, useGSAP } from '../lib/gsap'

interface RouteTransitionProps {
  readonly routeKey: string
}

export function RouteTransition({ routeKey }: RouteTransitionProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const motionMode = useMotionMode()

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const shell = root.closest('.app-shell') ?? root.parentElement
      const panels = gsap.utils.toArray<HTMLElement>('[data-transition-panel]', root)

      // Sweep every direct child of .app-shell (except the overlay itself) rather
      // than a tracked subset, so a stale `inert` from an interrupted run can
      // never be left behind.
      const setInert = () => {
        if (!shell) return
        Array.from(shell.children).forEach((child) => {
          if (child instanceof HTMLElement && child !== root) child.inert = true
        })
      }
      const clearInert = () => {
        if (!shell) return
        Array.from(shell.children).forEach((child) => {
          if (child instanceof HTMLElement && child !== root) child.inert = false
        })
      }

      // A previous timeline may have been reverted (revertOnUpdate) mid-flight;
      // clear any residue before starting a fresh one.
      clearInert()

      if (motionMode === 'reduced') {
        gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' })
        window.scrollTo(0, 0)
        return
      }

      const sweep = (enabled: boolean) => {
        if (enabled) {
          root.classList.remove('is-sweeping')
          void root.offsetWidth
          root.classList.add('is-sweeping')
        } else {
          root.classList.remove('is-sweeping')
        }
      }

      const timeline = gsap.timeline({
        defaults: { ease: 'power4.inOut' },
        onStart: () => {
          root.style.pointerEvents = 'auto'
          sweep(true)
          setInert()
        },
        onComplete: () => {
          root.style.pointerEvents = 'none'
          sweep(false)
          clearInert()
        },
        onInterrupt: () => {
          root.style.pointerEvents = 'none'
          sweep(false)
          clearInert()
        },
      })

      timeline
        .set(root, { autoAlpha: 1 })
        .set(panels, { yPercent: 110 })
        .to(panels, { yPercent: 0, duration: 0.3, stagger: 0.045 })
        .add(() => window.scrollTo(0, 0))
        .to(panels, {
          yPercent: -110,
          duration: 0.45,
          stagger: 0.055,
        }, '+=0.06')
        .set(root, { autoAlpha: 0 })

      // gsap.context calls this on revert (revertOnUpdate / unmount), so `inert`
      // is removed even when the timeline is killed before onComplete.
      return () => {
        sweep(false)
        clearInert()
      }
    },
    {
      scope: rootRef,
      dependencies: [motionMode, routeKey],
      revertOnUpdate: true,
    },
  )

  return (
    <div ref={rootRef} className="route-transition" aria-hidden="true">
      <div data-transition-panel><span>ROUTE</span></div>
      <div data-transition-panel><span>SYNC</span></div>
      <div data-transition-panel><span>READBACK</span></div>
      <div data-transition-panel><span>READY</span></div>
    </div>
  )
}
