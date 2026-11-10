import { useState } from 'react'
import { engineeringCases, type TroubleshootingCase } from '../data/engineering-cases'

interface EngineeringCasesProps {
  readonly embedded?: boolean
}

export function EngineeringCases({ embedded = false }: EngineeringCasesProps) {
  const [activeId, setActiveId] = useState<string>(engineeringCases[0]?.id ?? '')

  const currentCase: TroubleshootingCase | undefined =
    engineeringCases.find((item) => item.id === activeId) ?? engineeringCases[0]

  if (!currentCase) return null

  return (
    <section
      id="engineering-cases"
      className={`eng-cases${embedded ? ' is-embedded' : ''}`}
      aria-labelledby={embedded ? undefined : 'eng-cases-title'}
    >
      {!embedded && (
        <div className="eng-cases__header">
          <p className="eyebrow">现场工程 · 疑难问题排查</p>
          <h2 id="eng-cases-title">工程实战疑难攻坚与现场排查</h2>
          <p>
            记录在晶圆设备与自动化生产现场亲历的深水区难题：
            从示波器抓波、电磁干扰分析到供电拓扑重构与并发握手协议，呈现完整的软硬件攻关闭环。
          </p>
        </div>
      )}

      <div className="eng-cases__tabs" role="tablist" aria-label="排查案例选择">
        {engineeringCases.map((item) => {
          const isActive = item.id === currentCase.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`eng-cases__tab${isActive ? ' is-active' : ''}`}
              onClick={() => setActiveId(item.id)}
            >
              <span>{item.index}</span>
              <b>{item.shortTitle}</b>
            </button>
          )
        })}
      </div>

      <article className="case-card" key={currentCase.id}>
        <header className="case-card__hero">
          <div className="case-card__meta">
            <span className="case-card__badge">{currentCase.badge}</span>
            <span className="case-card__category">{currentCase.category}</span>
          </div>
          <h3 className="case-card__title">{currentCase.title}</h3>
          <p className="case-card__summary">{currentCase.summary}</p>
        </header>

        <div className="case-card__grid">
          {/* 1. 现象 */}
          <div className="case-block">
            <div className="case-block__heading">
              <span className="case-block__icon case-block__icon--symptom">01</span>
              <h4>故障现场与异常现象</h4>
            </div>
            <p className="case-block__lead">{currentCase.symptom.overview}</p>
            <ul className="case-block__list">
              {currentCase.symptom.details.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          {/* 2. 排查 */}
          <div className="case-block">
            <div className="case-block__heading">
              <span className="case-block__icon case-block__icon--investigation">02</span>
              <h4>排查验证与现场测试</h4>
            </div>
            <p className="case-block__lead">{currentCase.investigation.overview}</p>
            <ul className="case-block__list">
              {currentCase.investigation.steps.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          {/* 3. 根因 */}
          <div className="case-block">
            <div className="case-block__heading">
              <span className="case-block__icon case-block__icon--root">03</span>
              <h4>底层物理与逻辑根因</h4>
            </div>
            <p className="case-block__lead">{currentCase.rootCause.overview}</p>
            <ul className="case-block__list">
              {currentCase.rootCause.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          {/* 4. 成效概要 */}
          <div className="case-block">
            <div className="case-block__heading">
              <span className="case-block__icon case-block__icon--solution">04</span>
              <h4>整改成效与量化指标</h4>
            </div>
            <p className="case-block__lead">{currentCase.outcome.metric}</p>
            <p className="case-card__outcome-desc">{currentCase.outcome.desc}</p>
          </div>

          {/* 5. 详细工程整改方案 (Full Width) */}
          <div className="case-block case-block--full">
            <div className="case-block__heading">
              <span className="case-block__icon case-block__icon--solution">★</span>
              <h4>工程落地措施与防呆闭环</h4>
            </div>
            <p className="case-block__lead">{currentCase.solution.overview}</p>
            <div className="case-measures">
              {currentCase.solution.measures.map((measure) => (
                <div key={measure.title} className="case-measure">
                  <b>{measure.title}</b>
                  <p>{measure.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="case-card__footer">
          <div className="case-card__metric">
            <span className="case-card__metric-label">现场验证指标</span>
            <span className="case-card__metric-value">{currentCase.outcome.metric}</span>
          </div>
          <span className="case-card__outcome-desc">{currentCase.outcome.desc}</span>
        </footer>
      </article>
    </section>
  )
}
