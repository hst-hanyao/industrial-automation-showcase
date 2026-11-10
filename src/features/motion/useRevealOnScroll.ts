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
    // box-shadow, tilt and sweep are no longer clipped by the reveal mask.
    const timers: number[] = []
    const cancelRolls: Array<() => void> = []
    const settle = (item: HTMLElement) => {
      item.removeAttribute('data-reveal-card')
      item.classList.remove('is-revealed')
      item.style.removeProperty('--reveal-delay')
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const item = entry.target as HTMLElement
          item.classList.add('is-revealed')
          observer.unobserve(item)
          timers.push(window.setTimeout(() => settle(item), 900))
          if (rollSelector) {
            const target = item.querySelector<HTMLElement>(rollSelector)
            if (target) {
              cancelRolls.push(
                rollIndex(target, target.textContent ?? '', items.indexOf(item) * 70),
              )
            }
          }
        })
      },
      { rootMargin: '0px 0px -8%', threshold: 0.08 },
    )

    items.forEach((item) => observer.observe(item))
    return () => {
      observer.disconnect()
      timers.forEach((timer) => window.clearTimeout(timer))
      cancelRolls.forEach((cancel) => cancel())
      items.forEach(settle)
    }
  }, [rootRef, selector, rollSelector, motionMode])
}
