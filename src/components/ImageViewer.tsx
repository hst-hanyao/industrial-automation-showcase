import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import type { MediaAsset } from '../data/capabilities'
import { getMediaUrl } from '../lib/media'
import '../styles/image-viewer.css'

interface ImageViewerProps {
  readonly media: MediaAsset
  readonly description?: string
}

interface ViewerOrigin {
  readonly trigger: HTMLButtonElement
  readonly x: number
  readonly y: number
  readonly overflow: string
}

function restoreOrigin(origin: ViewerOrigin) {
  document.body.style.overflow = origin.overflow
  window.scrollTo({ left: origin.x, top: origin.y, behavior: 'instant' })
  if (origin.trigger.isConnected) origin.trigger.focus({ preventScroll: true })
}

export function ImageViewer({ media, description }: ImageViewerProps) {
  const [naturalSize, setNaturalSize] = useState(true)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const originRef = useRef<ViewerOrigin | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      const origin = originRef.current
      originRef.current = null
      if (dialog?.open) dialog.close()
      if (origin) restoreOrigin(origin)
    }
  }, [])

  const openImage = (trigger: HTMLButtonElement) => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    const origin = { trigger, x: window.scrollX, y: window.scrollY, overflow: document.body.style.overflow }
    originRef.current = origin
    setNaturalSize(true)
    document.body.style.overflow = 'hidden'
    try {
      dialog.showModal()
      canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    } catch (error) {
      originRef.current = null
      restoreOrigin(origin)
      throw error
    }
  }

  const closeImage = () => dialogRef.current?.close()

  const onClose = () => {
    const origin = originRef.current
    originRef.current = null
    if (origin) restoreOrigin(origin)
  }

  return (
    <>
      <button type="button" className="image-viewer__trigger" onClick={(event) => openImage(event.currentTarget)}
        aria-label={`查看原尺寸：${media.caption}`}>
        查看原尺寸 <span aria-hidden="true">↗</span>
      </button>
      <dialog ref={dialogRef} className="image-viewer" aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined} onClose={onClose}
        onCancel={(event) => { event.preventDefault(); closeImage() }}
        onClick={(event) => { if (event.target === event.currentTarget) closeImage() }}>
        <header className="image-viewer__header">
          <div><h3 id={titleId}>{media.caption}</h3><p>{media.width} × {media.height} · {naturalSize ? '原尺寸' : '适应窗口'}</p></div>
          <div className="image-viewer__actions">
            <button type="button" onClick={() => {
              setNaturalSize((value) => !value)
              canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: 'instant' })
            }} aria-pressed={!naturalSize}>{naturalSize ? '适应窗口' : '原尺寸'}</button>
            <button type="button" autoFocus onClick={closeImage} aria-label="关闭图片">关闭 ×</button>
          </div>
        </header>
        <div ref={canvasRef} className={`image-viewer__canvas${naturalSize ? '' : ' is-fit'}`} tabIndex={0}
          aria-label="图片滚动区域" style={{ '--image-width': `${media.width}px`, '--image-height': `${media.height}px` } as CSSProperties}>
          <img src={getMediaUrl(media.file)} alt={media.alt} width={media.width} height={media.height} decoding="async" />
        </div>
        {description ? <p id={descriptionId} className="image-viewer__note">{description}</p> : null}
      </dialog>
    </>
  )
}
