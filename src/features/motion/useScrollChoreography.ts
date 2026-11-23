import { type RefObject } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { ScrollTrigger } from '../../lib/gsap-scrolltrigger'
import { formatCounterStep, parseCounterToken } from '../../lib/motion'
import { useMotionMode } from './useMotionMode'

export interface ScrollChoreographyOptions {
  /** Additional dependencies that re-run choreography (e.g. capability.id, activeTab). */
  readonly deps?: readonly unknown[]
  /** ScrollTrigger start position (default: 'top 86%'). */
  readonly start?: string
  /** Stagger interval between [data-motion-item] elements in seconds (default: 0.055). */
  readonly stagger?: number
}

function animateCounterElement(element: HTMLElement): () => void {
  if (element.children.length > 0) return () => {}
  const originalText = element.textContent ?? ''
  const token = parseCounterToken(originalText)
  if (!token) return () => {}

  const state = { progress: 0 }
  const tween = gsap.to(state, {
    progress: 1,
    duration: 0.56,
    ease: 'none',
    onUpdate: () => {
      element.textContent = formatCounterStep(token, state.progress)
    },
    onComplete: () => {
      element.textContent = originalText
    },
  })

  return () => {
    tween.kill()
    element.textContent = originalText
  }
}

/**
 * GSAP ScrollTrigger choreography for lazy-loaded subpages and explorers.
 * Coordinates:
 * - [data-motion-group] -> staggers [data-motion-item] children once on enter
 * - [data-motion-reveal] -> standalone GPU-composited reveal once on enter
 * - [data-motion-counter] -> leaf telemetry counter roll settling strictly on original text
 * - [data-motion-parallax] -> subtle scrubbed Y depth layer
 *
 * Uses `once: true` so tall sections never hide again when scrolling upward, and
 * clears inline `transform` after reveal so hover tilt/elevation works freely.
 */
export function useScrollChoreography(
  rootRef: RefObject<HTMLElement | null>,
  options?: ScrollChoreographyOptions,
) {
  const motionMode = useMotionMode()
  const start = options?.start ?? 'top 86%'
  const stagger = options?.stagger ?? 0.055
  const extraDeps = options?.deps ?? []

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const groups = gsap.utils.toArray<HTMLElement>('[data-motion-group]', root)
      const standaloneReveals = gsap.utils.toArray<HTMLElement>('[data-motion-reveal]', root)
      const counters = gsap.utils.toArray<HTMLElement>('[data-motion-counter]', root)
      const parallaxLayers = gsap.utils.toArray<HTMLElement>('[data-motion-parallax]', root)

      if (motionMode === 'reduced') {
        const items = gsap.utils.toArray<HTMLElement>('[data-motion-item]', root)
        gsap.set([...groups, ...items, ...standaloneReveals, ...parallaxLayers], {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          clearProps: 'transform,opacity,visibility',
        })
        return
      }

      const counterCleanups: Array<() => void> = []

      groups.forEach((group) => {
        const items = gsap.utils.toArray<HTMLElement>('[data-motion-item]', group)
        const targets = items.length > 0 ? items : [group]
        const regularTargets = targets.filter((el) => !el.hasAttribute('data-motion-parallax'))
        const parallaxTargets = targets.filter((el) => el.hasAttribute('data-motion-parallax'))

        if (regularTargets.length > 0) {
          gsap.fromTo(
            regularTargets,
            { autoAlpha: 0, y: 22 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.54,
              stagger: regularTargets.length > 1 ? stagger : 0,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: group,
                start,
                once: true,
              },
            },
          )
        }

        // Items that also carry data-motion-parallax animate opacity only here so
        // the reveal never overwrites or clears the scrubbed y-axis parallax tween.
        if (parallaxTargets.length > 0) {
          gsap.fromTo(
            parallaxTargets,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: 0.54,
              stagger: parallaxTargets.length > 1 ? stagger : 0,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: group,
                start,
                once: true,
              },
            },
          )
        }
      })

      standaloneReveals.forEach((el) => {
        if (el.closest('[data-motion-group]')) return
        const hasParallax = el.hasAttribute('data-motion-parallax')
        gsap.fromTo(
          el,
          hasParallax ? { autoAlpha: 0 } : { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1,
            ...(hasParallax ? {} : { y: 0, clearProps: 'transform' }),
            duration: 0.52,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start,
              once: true,
            },
          },
        )
      })

      counters.forEach((counter) => {
        const originalText = counter.textContent ?? ''
        let cancelRoll: (() => void) | null = null
        ScrollTrigger.create({
          trigger: counter,
          start: 'top 92%',
          once: true,
          onEnter: () => {
            cancelRoll = animateCounterElement(counter)
            counterCleanups.push(cancelRoll)
          },
        })
        counterCleanups.push(() => {
          cancelRoll?.()
          counter.textContent = originalText
        })
      })

      parallaxLayers.forEach((layer) => {
        const rawAmount = Number.parseFloat(layer.dataset.motionParallax ?? '')
        const amount = Number.isFinite(rawAmount) ? rawAmount : 18
        gsap.fromTo(
          layer,
          { y: -amount * 0.5 },
          {
            y: amount * 0.5,
            ease: 'none',
            scrollTrigger: {
              trigger: layer,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.5,
            },
          },
        )
      })

      return () => {
        counterCleanups.forEach((cleanup) => cleanup())
      }
    },
    {
      scope: rootRef,
      dependencies: [motionMode, start, stagger, ...extraDeps],
      revertOnUpdate: true,
    },
  )
}
