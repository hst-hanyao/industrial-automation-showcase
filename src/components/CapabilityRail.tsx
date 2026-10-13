import { useRef } from 'react'
import { capabilities } from '../data/capabilities'
import { useMotionMode } from '../features/motion/useMotionMode'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { IntentLink } from './IntentLink'
import { MediaFrame } from './MediaFrame'
import { TechnicalDiagram } from './TechnicalDiagram'

export function CapabilityRail() {
  const rootRef = useRef<HTMLElement>(null)
  const motionMode = useMotionMode()

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const fill = root.querySelector<HTMLElement>('[data-rail-fill]')
      const chapters = gsap.utils.toArray<HTMLElement>('[data-rail-chapter]', root)
      const nodes = gsap.utils.toArray<HTMLElement>('[data-rail-node]', root)

      if (motionMode === 'reduced') {
        gsap.set(fill, { scaleY: 1 })
        gsap.set(chapters, { autoAlpha: 1, y: 0 })
        nodes.forEach((node) => node.classList.add('is-reached'))
        return
      }

      gsap.set(fill, { scaleY: 0, transformOrigin: 'top center' })
      gsap.to(fill, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top 62%',
          end: 'bottom 72%',
          scrub: 0.65,
        },
      })

      chapters.forEach((chapter, index) => {
        gsap.fromTo(
          chapter,
          { autoAlpha: 1, y: 48 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: chapter,
              start: 'top 78%',
              end: 'top 48%',
              scrub: 0.45,
            },
          },
        )

        const node = nodes[index]
        if (node) {
          ScrollTrigger.create({
            trigger: chapter,
            start: 'top 58%',
            end: 'bottom 42%',
            toggleClass: { targets: node, className: 'is-reached' },
          })
        }
      })
    },
    { scope: rootRef, dependencies: [motionMode], revertOnUpdate: true },
  )

  return (
    <section ref={rootRef} className="atlas-rail" aria-labelledby="atlas-title">
      <div className="atlas-rail__header">
        <p className="eyebrow">04 DOMAINS / ONE LOOP</p>
        <h2 id="atlas-title">沿控制链向下，沿反馈链返回</h2>
        <p>每一站都回答同一件事：命令去了哪里，状态又如何回来。</p>
      </div>

      <div className="atlas-rail__layout">
        <nav className="atlas-rail__map" aria-label="四项能力导航与滚动进度">
          <div className="atlas-rail__map-line" aria-hidden="true">
            <i data-rail-fill />
          </div>
          {capabilities.map((capability) => (
            <IntentLink
              key={capability.id}
              to={capability.route}
              className="atlas-rail__node"
              data-rail-node
              style={{ '--node-accent': capability.accent } as React.CSSProperties}
            >
              <span>{capability.order}</span>
              <div><b>{capability.shortName}</b><small>{capability.EnglishName}</small></div>
            </IntentLink>
          ))}
        </nav>

        <div className="atlas-rail__chapters">
          {capabilities.map((capability, index) => (
            <article
              key={capability.id}
              className={`atlas-chapter atlas-chapter--${capability.id}`}
              data-rail-chapter
              style={{ '--accent': capability.accent } as React.CSSProperties}
            >
              <div className="atlas-chapter__copy">
                <p className="eyebrow">DOMAIN {capability.order} / {capability.EnglishName}</p>
                <h3>{capability.title}</h3>
                <p>{capability.lead}</p>
                <dl>
                  <div><dt>证据入口</dt><dd>{capability.proofLine}</dd></div>
                  <div><dt>内容标签</dt><dd>{capability.tags.join(' / ')}</dd></div>
                </dl>
                <IntentLink className="text-link" to={capability.route}>
                  进入详情 <span aria-hidden="true">↗</span>
                </IntentLink>
              </div>

              <div className="atlas-chapter__visual">
                {capability.heroMedia ? (
                  <MediaFrame media={capability.heroMedia} />
                ) : (
                  <TechnicalDiagram type={index === 1 ? 'tasks' : 'state'} />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
