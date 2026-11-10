import { useEffect } from 'react'
import { useMotionMode } from './useMotionMode'

const SPOTLIGHT_SELECTOR = '.tech-card, .detail-hero__visual'
const RIPPLE_SELECTOR =
  '.primary-action, .secondary-action, .tech-card, .project-pagination a, .project-pagination button'
const RELEASE_SELECTOR = '.primary-action, .secondary-action'

/**
 * Global pointer delegation for the showcase interaction layer.
 * One set of listeners for the whole app; writes are coalesced into a single
 * animation frame so pointermove never forces a synchronous layout read.
 */
export function useShowcaseInteractions() {
  const motionMode = useMotionMode()

  useEffect(() => {
    if (motionMode === 'reduced') return
    if (typeof window.matchMedia !== 'function') return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let frame = 0
    let clientX = 0
    let clientY = 0
    let active: HTMLElement | null = null

    const reset = (element: HTMLElement) => {
      element.style.setProperty('--tilt-rx', '0deg')
      element.style.setProperty('--tilt-ry', '0deg')
      element.style.setProperty('--parallax-x', '0px')
      element.style.setProperty('--parallax-y', '0px')
    }

    const apply = () => {
      frame = 0
      const element = active
      if (!element) return
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const x = ((clientX - rect.left) / rect.width) * 100
      const y = ((clientY - rect.top) / rect.height) * 100
      element.style.setProperty('--mouse-x', `${x.toFixed(1)}%`)
      element.style.setProperty('--mouse-y', `${y.toFixed(1)}%`)

      if (element.matches('.tech-card')) {
        element.style.setProperty('--tilt-rx', `${((0.5 - y / 100) * 7).toFixed(2)}deg`)
        element.style.setProperty('--tilt-ry', `${((x / 100 - 0.5) * 9).toFixed(2)}deg`)
      } else {
        element.style.setProperty('--parallax-x', `${((x / 100 - 0.5) * 16).toFixed(1)}px`)
        element.style.setProperty('--parallax-y', `${((y / 100 - 0.5) * 16).toFixed(1)}px`)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      clientX = event.clientX
      clientY = event.clientY
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>(SPOTLIGHT_SELECTOR)
        : null
      if (target !== active) {
        if (active) reset(active)
        active = target
      }
      if (target && !frame) frame = requestAnimationFrame(apply)
    }

    const onPointerDown = (event: PointerEvent) => {
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>(RIPPLE_SELECTOR)
        : null
      if (!element) return
      const rect = element.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2.1
      const ripple = document.createElement('span')
      ripple.className = 'ui-ripple'
      ripple.style.width = `${size}px`
      ripple.style.height = `${size}px`
      ripple.style.left = `${event.clientX - rect.left}px`
      ripple.style.top = `${event.clientY - rect.top}px`
      element.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
    }

    const onPointerUp = (event: PointerEvent) => {
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>(RELEASE_SELECTOR)
        : null
      if (!element) return
      element.classList.remove('is-released')
      void element.offsetWidth
      element.classList.add('is-released')
      window.setTimeout(() => element.classList.remove('is-released'), 260)
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('pointerup', onPointerUp, { passive: true })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.querySelectorAll('.ui-ripple').forEach((node) => node.remove())
    }
  }, [motionMode])
}
