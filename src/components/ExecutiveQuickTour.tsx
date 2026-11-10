import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tourItems, type TourItem } from '../data/quick-tour'
import '../styles/quick-tour.css'

interface ExecutiveQuickTourProps {
  readonly isOpen: boolean
  readonly onClose: () => void
}

export function ExecutiveQuickTour({ isOpen, onClose }: ExecutiveQuickTourProps) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        const active = document.activeElement
        triggerRef.current = active instanceof HTMLElement ? active : null
        dialog.showModal()
      }
      return
    }

    if (dialog.open) {
      dialog.close()
      triggerRef.current?.focus()
    }
  }, [isOpen])

  function handleJump(item: TourItem) {
    onClose()
    if (item.isExternal) {
      window.location.assign(`${import.meta.env.BASE_URL}${item.route.replace(/^\//, '')}`)
      return
    }
    navigate(item.route)
  }

  return (
    <dialog
      ref={dialogRef}
      className="tour-modal__backdrop"
      aria-labelledby="tour-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="tour-modal">
        <div className="tour-modal__header">
          <div>
            <p className="tour-modal__eyebrow">精选导览 / 3分钟速览</p>
            <h2 id="tour-title" className="tour-modal__title">3 分钟面试官精选导览</h2>
            <p className="tour-modal__subtitle">
              专为技术负责人与面试官设计的快速阅览通道，一键穿透上位机、PLC、3D 运动学、双引擎视觉与实战排查核心资产。
            </p>
          </div>
          <button
            type="button"
            className="tour-modal__close"
            onClick={onClose}
            aria-label="关闭导览"
          >
            ×
          </button>
        </div>

        <div className="tour-modal__content">
          {tourItems.map((item) => (
            <article key={item.id} className="tour-card">
              <span className="tour-card__index">{item.index}</span>
              <div className="tour-card__body">
                <span className="tour-card__tag">{item.tag}</span>
                <h3 className="tour-card__title">{item.title}</h3>
                <ul className="tour-card__list">
                  {item.highlights.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="tour-card__action"
                onClick={() => handleJump(item)}
              >
                {item.actionText} <span>→</span>
              </button>
            </article>
          ))}
        </div>

        <div className="tour-modal__footer">
          <span>提示：ESC 键或点击遮罩可随时退出导览</span>
          <span>按序号推荐依次浏览</span>
        </div>
      </div>
    </dialog>
  )
}
