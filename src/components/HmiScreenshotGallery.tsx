import { useState } from 'react'
import { hmiGalleryItems } from '../data/hmi-gallery'
import { getMediaUrl } from '../lib/media'
import { ImageViewer } from './ImageViewer'
import '../styles/hmi-gallery.css'

export function HmiScreenshotGallery() {
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = hmiGalleryItems[activeIndex] ?? hmiGalleryItems[0]
  if (!selected) return null

  return (
    <section className="hmi-gallery" id="hmi-interface-gallery" aria-labelledby="hmi-gallery-title">
      <header className="hmi-gallery__heading">
        <div><p className="eyebrow">INTERFACE / PROJECT MATERIAL</p><h2 id="hmi-gallery-title">从架构回到真实界面。</h2></div>
        <p>五个页面，查看各自的职责与实现边界。</p>
      </header>
      <nav className="hmi-gallery__tabs" aria-label="选择上位机界面截图">
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
      <figure className="hmi-gallery__figure">
        <img src={getMediaUrl(selected.file)} alt={selected.alt} width={selected.width} height={selected.height} loading="lazy" decoding="async" />
        <figcaption><span>{selected.caption}</span><span>{selected.width} × {selected.height}</span></figcaption>
      </figure>
      <p className="hmi-gallery__boundary">{selected.boundary}</p>
    </section>
  )
}
