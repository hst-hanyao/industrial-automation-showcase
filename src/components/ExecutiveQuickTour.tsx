import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tourItems, type TourItem } from '../data/quick-tour'
import '../styles/quick-tour.css'

interface ExecutiveQuickTourProps {
  readonly isOpen: boolean
  readonly onClose: () => void
}

export function ExecutiveQuickTour({ isOpen, onClose }: ExecutiveQuickTourProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleJump(item: TourItem) {
    onClose()
    if (item.isExternal) {
      window.location.assign(item.route)
      return
    }

    if (item.route.startsWith('/#')) {
      const targetId = item.route.replace('/#', '')
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      } else {
        navigate('/')
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
        }, 150)
      }
      return
    }

    navigate(item.route)
  }

  return (
    <div
      className="tour-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="tour-modal">
        <header className="tour-modal__header">
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
        </header>

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

        <footer className="tour-modal__footer">
          <span>提示：ESC 键或点击遮罩可随时退出导览</span>
          <span>按序号推荐依次浏览</span>
        </footer>
      </div>
    </div>
  )
}
