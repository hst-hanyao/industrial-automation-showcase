import { useRef } from 'react'
import { CapabilityRail } from '../components/CapabilityRail'
import { ControlCore } from '../components/ControlCore'
import { IntentLink } from '../components/IntentLink'
import { ScrollTargetButton } from '../components/ScrollTargetButton'
import { SignalField } from '../features/signal-field/SignalField'
import { useMotionMode } from '../features/motion/useMotionMode'
import { usePageMeta } from '../hooks/usePageMeta'
import { gsap, useGSAP } from '../lib/gsap'

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
          <p className="eyebrow" data-home-intro>INDUSTRIAL AUTOMATION / ENGINEERING SHOWCASE</p>
          <h1 id="home-title" ref={headingRef} tabIndex={-1} data-home-intro>
            <span>控制不是按钮。</span>
            <strong>它是一条可以追踪的闭环。</strong>
          </h1>
          <p className="home-hero__lead" data-home-intro>
            以现有界面、源码语义和工程复盘，呈现上位机、PLC、运动控制与机器视觉之间的命令链和反馈链。
          </p>
          <div className="home-hero__actions" data-home-intro>
            <IntentLink className="primary-action" to="/hmi">从上位机进入 <span aria-hidden="true">↗</span></IntentLink>
            <ScrollTargetButton className="secondary-action" targetId="capability-atlas">
              查看四域图谱 <span aria-hidden="true">↓</span>
            </ScrollTargetButton>
          </div>
        </div>

        <div className="home-hero__core" data-home-intro>
          <ControlCore />
        </div>

        <div className="home-hero__proof" data-home-intro aria-label="内容边界">
          <div><span>01</span><b>项目证据</b><small>现有界面与材料</small></div>
          <div><span>02</span><b>源码或案例复盘</b><small>调用链与工程判断</small></div>
          <div><span>03</span><b>后续方向</b><small>不包装成已完成</small></div>
        </div>

        <p className="home-hero__scroll" aria-hidden="true" data-home-intro>
          SCROLL TO TRACE <i />
        </p>
      </section>

      <div id="capability-atlas" tabIndex={-1}>
        <CapabilityRail />
      </div>

      <section className="home-closing">
        <p className="eyebrow">EVIDENCE BEFORE LABELS</p>
        <h2>不做能力百分比。<br />让页面、调用链和边界自己说话。</h2>
        <IntentLink className="primary-action" to="/hmi">开始浏览完整链路 <span aria-hidden="true">→</span></IntentLink>
      </section>
    </main>
  )
}
