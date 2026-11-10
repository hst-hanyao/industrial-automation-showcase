import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { capabilities } from '../data/capabilities'
import { getMediaUrl } from '../lib/media'
import { CapabilityLink } from './CapabilityLink'
import '../styles/home-concept.css'

export function ControlCore() {
  const cardRef = useRef<HTMLDivElement>(null)

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateY = (x - 0.5) * 8
    const rotateX = (0.5 - y) * 8
    el.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`)
    el.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`)
    el.style.setProperty('--glow-x', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--glow-y', `${(y * 100).toFixed(1)}%`)
  }

  function handlePointerLeave() {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
    el.style.setProperty('--glow-x', '50%')
    el.style.setProperty('--glow-y', '50%')
  }

  return (
    <div
      ref={cardRef}
      className="home-device"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="home-device__label" aria-hidden="true">
        <span>ENGINEERING / FOUR DOMAINS</span><span>01—04</span>
      </div>
      <figure className="home-device__figure">
        <img
          src={getMediaUrl('wafer-electroplating-concept.webp')}
          alt="白色模块化晶圆电镀设备概念插画，包含工艺腔室、晶圆盒和机械传送部件；AI 生成，非项目实拍"
          width={1536}
          height={1024}
          fetchPriority="high"
          decoding="async"
        />
        <figcaption><span>AI 生成</span>设备概念插画 · 非项目实拍</figcaption>
      </figure>
      <nav className="home-device__domains" aria-label="四项能力入口">
        {capabilities.map((capability) => (
          <CapabilityLink
            key={capability.id}
            capability={capability}
            className="home-device__domain"
            style={{ '--domain-accent': capability.accent } as CSSProperties}
          >
            <span>{capability.order}</span>
            <div><b>{capability.shortName}</b><small>{capability.EnglishName}</small></div>
            <i aria-hidden="true">↗</i>
          </CapabilityLink>
        ))}
      </nav>
    </div>
  )
}
