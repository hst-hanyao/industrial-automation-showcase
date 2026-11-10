import { useRef } from 'react'
import { techDomains } from '../data/tech-stack'

export function TechStackMatrix() {
  const rootRef = useRef<HTMLElement>(null)

  return (
    <section ref={rootRef} id="tech-matrix" className="tech-matrix" aria-labelledby="tech-matrix-title">
      <div className="tech-matrix__header">
        <p className="eyebrow">ENGINEERING STACK / FULL SPECTRUM</p>
        <h2 id="tech-matrix-title">全栈工业自动化与控制工程矩阵</h2>
        <p>
          从现场总线、硬实时 PLC、运动控制应用、工业上位机，到工业机器视觉与 3D 运动学孪生仿真，
          展示可落地、可追溯、闭环验证的技术能力谱系。
        </p>
      </div>

      <div className="tech-matrix__grid">
        {techDomains.map((domain) => (
          <article key={domain.id} className="tech-card">
            <div className="tech-card__top">
              <span className="tech-card__badge">{domain.badge}</span>
              <span className="tech-card__index">{domain.index}</span>
            </div>
            <h3 className="tech-card__title">{domain.title}</h3>
            <p className="tech-card__category">{domain.category}</p>

            <div className="tech-card__items">
              {domain.items.map((item) => (
                <div key={item.label} className="tech-card__item">
                  <div className="tech-card__item-header">
                    <span className="tech-card__item-label">{item.label}</span>
                    <div className="tech-card__item-tags">
                      {item.tags.map((tag) => (
                        <span key={tag} className="tech-card__item-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <p className="tech-card__item-note">{item.note}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
