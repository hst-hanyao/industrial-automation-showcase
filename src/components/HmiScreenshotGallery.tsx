import { useRef, useState, type KeyboardEvent } from 'react'
import { hmiGalleryItems } from '../data/hmi-gallery'
import { useScrollChoreography } from '../features/motion/useScrollChoreography'
import { getMediaUrl } from '../lib/media'
import { ImageViewer } from './ImageViewer'
import { SafeImage } from './SafeImage'
import '../styles/hmi-gallery.css'

export function HmiScreenshotGallery() {
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLElement>(null)
  const selected = hmiGalleryItems[activeIndex] ?? hmiGalleryItems[0]

  useScrollChoreography(rootRef)

  if (!selected) return null

  function onTabsKeyDown(event: KeyboardEvent<HTMLElement>) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const total = hmiGalleryItems.length
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? total - 1
      : (activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + total) % total
    setActiveIndex(nextIndex)
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button')
    buttons[nextIndex]?.focus()
  }

  return (
    <section ref={rootRef} className="hmi-gallery" id="hmi-interface-gallery" aria-labelledby="hmi-gallery-title">
      <header className="hmi-gallery__heading" data-motion-reveal>
        <div><p className="eyebrow">INTERFACE / PROJECT MATERIAL</p><h2 id="hmi-gallery-title">从架构回到真实界面。</h2></div>
        <p>五个页面，查看各自的职责与实现边界。</p>
      </header>
      <nav className="hmi-gallery__tabs" aria-label="选择上位机界面截图" onKeyDown={onTabsKeyDown}>
        {hmiGalleryItems.map((item, index) => (
          <button key={item.id} type="button" aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)}>
            <span>{String(index + 1).padStart(2, '0')}</span>{item.label}
          </button>
        ))}
      </nav>
      <div className="hmi-gallery__context" aria-live="polite">
        <p>{selected.description}</p>
        <ImageViewer media={selected} description={selected.boundary} />
      </div>
      <figure key={selected.id} className="hmi-gallery__figure" data-motion-panel>
        <SafeImage src={getMediaUrl(selected.file)} alt={selected.alt} width={selected.width} height={selected.height} loading="lazy" decoding="async" />
        <figcaption><span>{selected.caption}</span><span>{selected.width} × {selected.height}</span></figcaption>
      </figure>
      <p className="hmi-gallery__boundary">{selected.boundary}</p>
    </section>
  )
}
