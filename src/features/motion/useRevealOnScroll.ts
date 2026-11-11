import { useLayoutEffect, type RefObject } from 'react'
import { useMotionMode } from './useMotionMode'

/** Instrument-style self-test roll that always settles on the original text. */
function rollIndex(element: HTMLElement, target: string, delay: number): () => void {
  const value = Number.parseInt(target, 10)
  if (!Number.isFinite(value) || !target.trim()) return () => {}

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
      const shown = t < 0.72 ? Math.floor(Math.random() * 9) + 1 : value
      element.textContent = String(shown).padStart(target.length, '0')
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
 */
export function useRevealOnScroll(
  rootRef: RefObject<HTMLElement | null>,
  selector: string,
  rollSelector?: string,
) {
  const motionMode = useMotionMode()

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (motionMode === 'reduced' || !('IntersectionObserver' in window)) return

    const items = Array.from(root.querySelectorAll<HTMLElement>(selector))
    items.forEach((item, index) => {
      item.setAttribute('data-reveal-card', '')
      item.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 70}ms`)
    })

    // Drop the reveal attribute after the transition so the card's own
    // tilt and sweep are no longer affected by the reveal transform.
    const timers: number[] = []
    const cancelRolls: Array<() => void> = []
    const pending = new Set(items)
    const settle = (item: HTMLElement) => {
      item.removeAttribute('data-reveal-card')
      item.classList.remove('is-revealed')
      item.style.removeProperty('--reveal-delay')
    }

    let observer: IntersectionObserver | null = null
    let frame = 0
    let detached = false

    const reveal = (item: HTMLElement) => {
      if (!pending.has(item)) return
      pending.delete(item)
      item.classList.add('is-revealed')
      observer?.unobserve(item)
      timers.push(window.setTimeout(() => settle(item), 900))
      if (rollSelector) {
        const target = item.querySelector<HTMLElement>(rollSelector)
        if (target) {
          cancelRolls.push(
            rollIndex(target, target.textContent ?? '', items.indexOf(item) * 70),
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
        if (rect.top < viewport * 0.92 && rect.bottom > 0) reveal(item)
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
      { rootMargin: '0px 0px -8%', threshold: 0 },
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
  }, [rootRef, selector, rollSelector, motionMode])
}
