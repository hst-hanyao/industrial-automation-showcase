import { useRef, type ReactNode } from 'react'
import {
  evidenceLabels,
  getCapabilityNeighbors,
  type Capability,
  type EvidenceKind,
} from '../data/capabilities'
import { useMotionMode } from '../features/motion/useMotionMode'
import { usePageMeta } from '../hooks/usePageMeta'
import { gsap, useGSAP } from '../lib/gsap'
import { IntentLink } from './IntentLink'
import { MediaFrame } from './MediaFrame'
import { TechnicalDiagram } from './TechnicalDiagram'

const evidenceOrder: readonly EvidenceKind[] = ['project', 'review', 'future']

interface DetailPageProps {
  readonly capability: Capability
  readonly heroVisual?: ReactNode
  readonly heroLayout?: 'default' | 'architecture'
  readonly afterHero?: ReactNode
}

export function DetailPage({ capability, heroVisual, heroLayout = 'default', afterHero }: DetailPageProps) {
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const motionMode = useMotionMode()
  const neighbors = getCapabilityNeighbors(capability.id)

  usePageMeta(capability.title, headingRef, motionMode === 'reduced' ? 0 : 1160)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const introItems = gsap.utils.toArray<HTMLElement>('[data-detail-intro]', root)
      const blocks = gsap.utils.toArray<HTMLElement>('[data-detail-block]', root)

      if (motionMode === 'reduced') {
        gsap.set([...introItems, ...blocks], { autoAlpha: 1, y: 0 })
        return
      }

      gsap.timeline({ defaults: { duration: 0.8, ease: 'power3.out' } })
        .fromTo(introItems, { autoAlpha: 0, y: 34 }, {
          autoAlpha: 1,
          y: 0,
          stagger: 0.08,
        })

      blocks.forEach((block) => {
        gsap.fromTo(
          block,
          { autoAlpha: 0, y: 54 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: block,
              start: 'top 82%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      })
    },
    {
      scope: rootRef,
      dependencies: [capability.id, motionMode],
      revertOnUpdate: true,
    },
  )

  return (
    <main
      ref={rootRef}
      id="main-content"
      className={`detail-page detail-page--${capability.id}`}
      tabIndex={-1}
      style={{
        '--accent': capability.accent,
        '--accent-soft': capability.accentSoft,
      } as React.CSSProperties}
    >
      <section className={`detail-hero${heroLayout === 'architecture' ? ' detail-hero--architecture' : ''}`}>
        <div className="detail-hero__index" data-detail-intro aria-hidden="true">
          <span>{capability.order}</span>
          <i />
          <small>04</small>
        </div>

        <div className="detail-hero__copy">
          <p className="eyebrow" data-detail-intro>{capability.EnglishName}</p>
          <h1 ref={headingRef} tabIndex={-1} data-detail-intro>{capability.title}</h1>
          <p className="detail-hero__lead" data-detail-intro>{capability.lead}</p>
          <div className="tag-row" data-detail-intro>
            {capability.tags.map((tag) => <span key={tag} translate="no">{tag}</span>)}
          </div>
        </div>

        <div className="detail-hero__visual" data-detail-intro>
          {heroVisual ?? (capability.heroMedia ? (
            <MediaFrame media={capability.heroMedia} eager />
          ) : (
            <TechnicalDiagram type="tasks" />
          ))}
        </div>

        <aside className="evidence-legend" data-detail-intro aria-label="内容证据分类">
          <p>READING KEY</p>
          {evidenceOrder.map((kind) => (
            <span key={kind} data-kind={kind}>{evidenceLabels[kind]}</span>
          ))}
          <small>材料存在不等于个人能力评级</small>
        </aside>
      </section>

      {afterHero}

      <div className="detail-sections">
        {capability.sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={`detail-block detail-block--${index % 2 === 0 ? 'left' : 'right'}${!section.diagram && !section.media?.length ? ' detail-block--text' : ''}`}
            data-detail-block
          >
            <header className="detail-block__header">
              <div>
                <span className="evidence-badge" data-kind={section.kind}>
                  {evidenceLabels[section.kind]}
                </span>
                <p className="eyebrow">{section.eyebrow}</p>
                <h2>{section.title}</h2>
              </div>
              <span className="detail-block__number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
            </header>

            <div className="detail-block__body">
              <div className="detail-block__copy">
                <p className="detail-block__summary">{section.summary}</p>
                <ul>
                  {section.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                {section.code ? (
                  <pre className="code-panel" tabIndex={0}><code translate="no">{section.code.join('\n')}</code></pre>
                ) : null}
              </div>

              {section.diagram || section.media?.length ? <div className="detail-block__evidence">
                {section.diagram ? <TechnicalDiagram type={section.diagram} /> : null}
                {section.media?.map((media) => <MediaFrame key={media.file} media={media} />)}
              </div> : null}
            </div>
          </section>
        ))}
      </div>

      <nav className="project-pagination" aria-label="相邻能力项目">
        <IntentLink to={neighbors.previous.route}>
          <span>PREVIOUS / {neighbors.previous.order}</span>
          <strong>{neighbors.previous.title}</strong>
        </IntentLink>
        <IntentLink to="/" className="project-pagination__home">
          <span>CONTROL CORE</span>
          <strong>返回能力图谱</strong>
        </IntentLink>
        <IntentLink to={neighbors.next.route}>
          <span>NEXT / {neighbors.next.order}</span>
          <strong>{neighbors.next.title}</strong>
        </IntentLink>
      </nav>
    </main>
  )
}
