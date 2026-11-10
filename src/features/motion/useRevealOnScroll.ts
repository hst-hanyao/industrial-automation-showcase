import { useLayoutEffect, type RefObject } from 'react'
import { useMotionMode } from './useMotionMode'

/**
 * Attaches scroll-driven reveal attributes before paint. SSR and reduced-motion
 * leave the elements fully visible because the attributes are never attached.
 */
export function useRevealOnScroll(
  rootRef: RefObject<HTMLElement | null>,
  selector: string,
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
        })
      },
      { rootMargin: '0px 0px -8%', threshold: 0.08 },
    )

    items.forEach((item) => observer.observe(item))
    return () => {
      observer.disconnect()
      timers.forEach((timer) => window.clearTimeout(timer))
      items.forEach(settle)
    }
  }, [rootRef, selector, motionMode])
}
