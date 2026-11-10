import { useEffect, useRef, type PointerEvent } from 'react'
import { getMediaUrl } from '../lib/media'
import { SafeImage } from './SafeImage'
import '../styles/home-concept.css'

export function ControlCore() {
  const cardRef = useRef<HTMLDivElement>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const frameRef = useRef<number | null>(null)
  const pointerRef = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    rectRef.current = el.getBoundingClientRect()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      rectRef.current = el.getBoundingClientRect()
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  function applyTilt() {
    frameRef.current = null
    const el = cardRef.current
    if (!el) return
    const { x, y } = pointerRef.current
    const rotateY = (x - 0.5) * 8
    const rotateX = (0.5 - y) * 8
    el.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`)
    el.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`)
    el.style.setProperty('--glow-x', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--glow-y', `${(y * 100).toFixed(1)}%`)
  }

  function handlePointerEnter() {
    const el = cardRef.current
    if (!el) return
    rectRef.current = el.getBoundingClientRect()
    el.classList.add('is-tilting')
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = rectRef.current
    if (!rect || !rect.width || !rect.height) return
    pointerRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(applyTilt)
    }
  }

  function handlePointerLeave() {
    const el = cardRef.current
    if (!el) return
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    el.classList.remove('is-tilting')
    // 变量归零；transform 由 .home-device 既有的 260ms transition 平滑回正
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
    el.style.setProperty('--glow-x', '50%')
    el.style.setProperty('--glow-y', '50%')
  }

  return (
    <div
      ref={cardRef}
      className="home-device"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="home-device__label" aria-hidden="true">
        <span>半导体晶圆电镀设备概念模型</span>
      </div>
      <figure className="home-device__figure">
        <SafeImage
          src={getMediaUrl('wafer-electroplating-concept.webp')}
          alt="白色模块化晶圆电镀设备概念插画，包含工艺腔室、晶圆盒和机械传送部件；AI 生成，非项目实拍"
          width={1536}
          height={1024}
          fetchPriority="high"
          decoding="async"
        />
        <figcaption><span>AI 生成</span>设备概念插画 · 非项目实拍</figcaption>
      </figure>
    </div>
  )
}
