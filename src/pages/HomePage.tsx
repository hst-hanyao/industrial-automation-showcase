import { useRef } from 'react'
import { ControlCore } from '../components/ControlCore'
import { IntentLink } from '../components/IntentLink'
import { ScrollTargetButton } from '../components/ScrollTargetButton'
import { TechStackMatrix } from '../components/TechStackMatrix'
import { SignalField } from '../features/signal-field/SignalField'
import { useMotionMode } from '../features/motion/useMotionMode'
import { usePageMeta } from '../hooks/usePageMeta'
import { gsap, useGSAP } from '../lib/gsap'
import '../styles/tech-stack.css'

export default function HomePage() {
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const motionMode = useMotionMode()

  usePageMeta(
    '工业自动化能力图谱',
    headingRef,
    motionMode === 'reduced' ? 0 : 1160,
  )

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const intro = gsap.utils.toArray<HTMLElement>('[data-home-intro]', root)
      if (motionMode === 'reduced') {
        gsap.set(intro, { autoAlpha: 1, y: 0 })
        return
      }

      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(intro, { autoAlpha: 0, y: 42 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
        })
    },
    { scope: rootRef, dependencies: [motionMode], revertOnUpdate: true },
  )

  return (
    <main ref={rootRef} id="main-content" className="home-page" tabIndex={-1}>
      <section className="home-hero" aria-labelledby="home-title">
        <SignalField />
        <div className="home-hero__frame" aria-hidden="true"><i /><i /><i /><i /></div>

        <div className="home-hero__copy">
          <p className="eyebrow" data-home-intro>工业自动化 · 现场控制工程</p>
          <h1 id="home-title" ref={headingRef} tabIndex={-1} data-home-intro>
            <span>控制不是按钮。</span>
            <strong>它是一条可以追踪的闭环。</strong>
          </h1>
          <p className="home-hero__lead" data-home-intro>
            以现有界面、源码语义和工程复盘，呈现上位机、PLC、运动控制与机器视觉之间的命令链和反馈链。
          </p>
          <div className="home-hero__actions" data-home-intro>
            <IntentLink className="primary-action" to="/hmi">从上位机进入 <span aria-hidden="true">↗</span></IntentLink>
            <ScrollTargetButton className="secondary-action" targetId="tech-matrix">
              工程矩阵 <span aria-hidden="true">⚙</span>
            </ScrollTargetButton>
            <IntentLink className="secondary-action" to="/cases">
              问题排查 <span aria-hidden="true">★</span>
            </IntentLink>
          </div>
        </div>

        <div className="home-hero__core" data-home-intro>
          <ControlCore />
        </div>

        <div className="home-hero__proof" data-home-intro aria-label="展示内容分类">
          <div><span>01</span><b>项目证据</b><small>现有界面与材料</small></div>
          <div><span>02</span><b>源码或案例复盘</b><small>调用链与工程判断</small></div>
          <div><span>03</span><b>设计说明</b><small>架构、接口与流程</small></div>
        </div>

        <p className="home-hero__scroll" aria-hidden="true" data-home-intro>
          向下滚动查看工程矩阵 <i />
        </p>
      </section>

      <TechStackMatrix />
    </main>
  )
}
