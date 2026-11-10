import { useRef } from 'react'
import { ControlCore } from '../components/ControlCore'
import { IntentLink } from '../components/IntentLink'
import { ScrollTargetButton } from '../components/ScrollTargetButton'
import { TechStackMatrix } from '../components/TechStackMatrix'
import { SignalField } from '../features/signal-field/SignalField'
import { MOTION } from '../features/motion/motion-tokens'
import { useMotionMode } from '../features/motion/useMotionMode'
import { usePageMeta } from '../hooks/usePageMeta'
import { gsap, useGSAP } from '../lib/gsap'
import '../styles/tech-stack.css'

export default function HomePage() {
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const motionMode = useMotionMode()

  // Route autofocus waits until the intro sequence finishes so it does not
  // steal focus while the heading is still animating in.
  usePageMeta(
    '工业自动化能力图谱',
    headingRef,
    motionMode === 'reduced' ? 0 : MOTION.focusDelay,
  )

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const pick = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, root)
      const corners = pick('.home-hero__frame i')
      const eyebrow = pick('.home-hero__copy .eyebrow')
      const lines = pick('#home-title > *')
      const lead = pick('.home-hero__lead')
      const actions = pick('.home-hero__actions > *')
      const core = pick('.home-hero__core')
      const proof = pick('.home-hero__proof > div')
      const hint = pick('.home-hero__scroll')
      const all = [...corners, ...eyebrow, ...lines, ...lead, ...actions, ...core, ...proof, ...hint]

      if (motionMode === 'reduced') {
        gsap.set(all, {
          autoAlpha: 1, x: 0, y: 0, scale: 1, rotateY: 0, skewY: 0, clipPath: 'none',
        })
        return
      }

      const timeline = gsap.timeline({ defaults: { ease: 'power4.out' } })

      timeline
        .fromTo(corners, { opacity: 0, scale: 0.3 }, {
          opacity: 1, scale: 1, duration: 0.34, stagger: 0.05,
        }, 0)
        .fromTo(eyebrow, { opacity: 0, clipPath: 'inset(0 100% 0 0)', x: -18 }, {
          opacity: 1, clipPath: 'inset(0 0% 0 0)', x: 0, duration: 0.46,
        }, 0.04)
        .fromTo(lines, { opacity: 0, clipPath: 'inset(0 0 100% 0)', y: 26, skewY: 5 }, {
          opacity: 1, clipPath: 'inset(0 0 0% 0)', y: 0, skewY: 0,
          duration: 0.56, stagger: 0.085,
        }, 0.1)
        .fromTo(core, { opacity: 0, scale: 0.9, rotateY: -16, y: 34 }, {
          opacity: 1, scale: 1, rotateY: 0, y: 0, duration: 0.62,
        }, 0.14)
        .fromTo(lead, { opacity: 0, y: 18 }, {
          opacity: 1, y: 0, duration: 0.44,
        }, 0.24)
        .fromTo(actions, { opacity: 0, y: 22, scale: 0.92 }, {
          opacity: 1, y: 0, scale: 1, duration: 0.44, stagger: 0.06,
          ease: 'back.out(1.7)',
        }, 0.3)
        .fromTo(proof, { opacity: 0, y: 16 }, {
          opacity: 1, y: 0, duration: 0.36, stagger: 0.06,
        }, 0.38)
        .fromTo(hint, { opacity: 0 }, {
          opacity: 1, duration: 0.28,
        }, 0.54)
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

        <div className="home-hero__proof" data-home-intro role="group" aria-label="展示内容分类">
          <div><span>01</span><b>项目证据</b><small>现有界面与材料</small></div>
          <div><span>02</span><b>源码或案例复盘</b><small>调用链与工程判断</small></div>
          <div><span>03</span><b>设计说明</b><small>架构、接口与流程</small></div>
        </div>

        <p className="home-hero__scroll" aria-hidden="true" data-home-intro>
          向下滚动查看工程矩阵 <i />
        </p>
      </section>

      <TechStackMatrix />

      <nav className="project-pagination" aria-label="相邻能力项目">
        <IntentLink to="/vision">
          <span>上一页 · 04</span>
          <strong>OpenCV & HALCON 机器视觉工作台</strong>
        </IntentLink>
        <IntentLink
          to="/capabilities"
          className="project-pagination__home"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: motionMode === 'reduced' ? 'auto' : 'smooth' })
          }}
        >
          <span>能力全景</span>
          <strong>返回能力图谱</strong>
        </IntentLink>
        <IntentLink to="/hmi">
          <span>下一页 · 01</span>
          <strong>工业上位机系统</strong>
        </IntentLink>
      </nav>
    </main>
  )
}
