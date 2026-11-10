import { useState } from 'react'
import { visionEngines, type VisionEngine } from '../data/vision-dual-engine'
import '../styles/vision-explorer.css'

export function VisionDualEngineExplorer() {
  const [activeId, setActiveId] = useState<'opencv' | 'halcon'>('opencv')

  const currentEngine: VisionEngine | undefined =
    visionEngines.find((item) => item.id === activeId) ?? visionEngines[0]

  if (!currentEngine) return null

  return (
    <div className="vision-explorer" role="region" aria-label="双引擎视觉工作台架构解析">
      <div className="vision-explorer__tabs">
        <div className="vision-explorer__nav" role="tablist" aria-label="视觉引擎选择">
          {visionEngines.map((engine) => {
            const isActive = engine.id === currentEngine.id
            return (
              <button
                key={engine.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`vision-explorer__btn${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveId(engine.id)}
              >
                <span>{engine.id === 'opencv' ? '01' : '02'}</span>
                <b>{engine.shortName}</b>
              </button>
            )
          })}
        </div>
        <span className="vision-explorer__meta">{currentEngine.version}</span>
      </div>

      <div className="vision-explorer__banner">
        <h3>{currentEngine.name}</h3>
        <p>{currentEngine.summary}</p>
      </div>

      {/* 5大核心面板流水线 */}
      <div className="vision-pipeline">
        <span className="vision-pipeline__label">WORKBENCH 5-STAGE WORKFLOW / 5 大工作台页面</span>
        <div className="vision-pipeline__steps">
          {currentEngine.panels.map((panel, idx) => (
            <div key={panel} className="vision-pipeline__step">
              <span>{String(idx + 1).padStart(2, '0')}</span>
              <b>{panel}</b>
            </div>
          ))}
        </div>
      </div>

      {/* 核心工程支柱 */}
      <div className="vision-pillars">
        {currentEngine.pillars.map((pillar) => (
          <div key={pillar.title} className="vision-pillar">
            <h4>{pillar.title}</h4>
            <p>{pillar.desc}</p>
            <div className="vision-pillar__tags">
              {pillar.tags.map((tag) => (
                <span key={tag} className="vision-pillar__tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 算子与算法分类 */}
      <div className="vision-ops">
        <span className="vision-ops__label">OPERATOR TAXONOMY / 算子与算法目录体系</span>
        <div className="vision-ops__grid">
          {currentEngine.operatorCategories.map((cat) => (
            <div key={cat.category} className="vision-op-card">
              <div className="vision-op-card__top">
                <b>{cat.category}</b>
                <span>{cat.count}</span>
              </div>
              <small>{cat.examples.join(' · ')}</small>
            </div>
          ))}
        </div>
      </div>

      {/* 验证与成效 */}
      <div className="vision-verifications">
        {currentEngine.verifications.map((veri) => (
          <div key={veri.title} className="vision-veri-item">
            <span className="vision-veri-item__metric">{veri.metric}</span>
            <b>{veri.title}</b>
            <p>{veri.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
