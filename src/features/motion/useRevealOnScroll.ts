import { useLayoutEffect, type RefObject } from 'react'
import { formatCounterStep, parseCounterToken } from '../../lib/motion'
import { useMotionMode } from './useMotionMode'

export interface RevealOnScrollOptions {
  /** Delay step between consecutive cards in the same batch (ms). Default: 65. */
  readonly staggerMs?: number
  /** Cap for stagger index multiplier so late items never lag. Default: 6. */
  readonly maxStaggerIndex?: number
  /** Optional header selector revealed just ahead of the cards. */
  readonly headerSelector?: string
}

/** Instrument-style self-test roll that always settles on the original text. */
function rollIndex(element: HTMLElement, target: string, delay: number): () => void {
  const token = parseCounterToken(target)
  if (!token) return () => {}

  const startedAt = performance.now() + delay
  const duration = 460
  let frame = 0

  const tick = (now: number) => {
    if (now < startedAt) {
      frame = window.requestAnimationFrame(tick)
      return
    }
    const t = Math.min(1, (now - startedAt) / duration)
    if (t < 1) {
      element.textContent = formatCounterStep(token, t)
      frame = window.requestAnimationFrame(tick)
    } else {
      element.textContent = target
      frame = 0
    }
  }

  frame = window.requestAnimationFrame(tick)
  return () => {
    if (frame) window.cancelAnimationFrame(frame)
    element.textContent = target
  }
}

/**
 * Attaches scroll-driven reveal attributes before paint. SSR and reduced-motion
 * leave the elements fully visible because the attributes are never attached.
 *
 * Visibility is never delegated to a single mechanism: the observer is backed
 * by a geometry check on scroll/resize, so a card cannot stay hidden forever if
 * IntersectionObserver misbehaves (or the element is clipped by another effect).
 *
 * Deliberately free of gsap/ScrollTrigger so first-screen consumers (e.g.
 * TechStackMatrix) keep ScrollTrigger out of the initial bundle.
 */
export function useRevealOnScroll(
  rootRef: RefObject<HTMLElement | null>,
  selector: string,
  rollSelector?: string,
  options?: RevealOnScrollOptions,
) {
  const motionMode = useMotionMode()
  const staggerMs = options?.staggerMs ?? 65
  const maxStaggerIndex = options?.maxStaggerIndex ?? 6
  const headerSelector = options?.headerSelector

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const headerItems = headerSelector
      ? Array.from(root.querySelectorAll<HTMLElement>(headerSelector))
      : []
    const cardItems = Array.from(root.querySelectorAll<HTMLElement>(selector))
    const items = [...headerItems, ...cardItems]

    const settle = (item: HTMLElement) => {
      item.removeAttribute('data-reveal-card')
      item.classList.remove('is-revealed')
      item.style.removeProperty('--reveal-delay')
    }

    if (motionMode === 'reduced' || !('IntersectionObserver' in window)) {
      items.forEach(settle)
      return
    }

    headerItems.forEach((item) => {
      item.setAttribute('data-reveal-card', '')
      item.style.setProperty('--reveal-delay', '0ms')
    })

    cardItems.forEach((item, index) => {
      item.setAttribute('data-reveal-card', '')
      item.style.setProperty('--reveal-delay', `${Math.min(index, maxStaggerIndex) * staggerMs}ms`)
    })

    // Drop the reveal attribute after the transition so the card's own
    // tilt and sweep are no longer affected by the reveal transform.
    const timers: number[] = []
    const cancelRolls: Array<() => void> = []
    const pending = new Set(items)

    let observer: IntersectionObserver | null = null
    let frame = 0
    let detached = false

    const reveal = (item: HTMLElement) => {
      if (!pending.has(item)) return
      pending.delete(item)
      item.classList.add('is-revealed')
      observer?.unobserve(item)
      const cardIndex = cardItems.indexOf(item)
      const delay = cardIndex >= 0 ? Math.min(cardIndex, maxStaggerIndex) * staggerMs : 0
      timers.push(window.setTimeout(() => settle(item), 600 + delay))
      if (rollSelector && cardIndex >= 0) {
        const target = item.querySelector<HTMLElement>(rollSelector)
        if (target && target.children.length === 0) {
          cancelRolls.push(
            rollIndex(target, target.textContent ?? '', delay),
          )
        }
      }
      if (!pending.size) detach()
    }

    const checkVisible = () => {
      frame = 0
      if (!pending.size) return
      const viewport = window.innerHeight || document.documentElement.clientHeight
      for (const item of [...pending]) {
        const rect = item.getBoundingClientRect()
        if (rect.top < viewport * 0.94 && rect.bottom > 0) reveal(item)
      }
    }

    const onViewportChange = () => {
      if (!frame) frame = window.requestAnimationFrame(checkVisible)
    }

    function detach() {
      if (detached) return
      detached = true
      window.removeEventListener('scroll', onViewportChange)
      window.removeEventListener('resize', onViewportChange)
      if (frame) window.cancelAnimationFrame(frame)
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement)
        })
      },
      { rootMargin: '0px 0px -6%', threshold: 0 },
    )

    items.forEach((item) => observer?.observe(item))
    window.addEventListener('scroll', onViewportChange, { passive: true })
    window.addEventListener('resize', onViewportChange)
    onViewportChange()

    return () => {
      observer?.disconnect()
      detach()
      timers.forEach((timer) => window.clearTimeout(timer))
      cancelRolls.forEach((cancel) => cancel())
      items.forEach(settle)
    }
  }, [rootRef, selector, rollSelector, headerSelector, staggerMs, maxStaggerIndex, motionMode])
}
