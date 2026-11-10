import { useRef } from 'react'
import { EngineeringCases } from '../components/EngineeringCases'
import { IntentLink } from '../components/IntentLink'
import { useMotionMode } from '../features/motion/useMotionMode'
import { usePageMeta } from '../hooks/usePageMeta'
import { gsap, useGSAP } from '../lib/gsap'
import '../styles/engineering-cases.css'
import '../styles/cases-page.css'

const fieldPrinciples = [
  {
    index: '01',
    badge: '供电拓扑与接地',
    title: '双电源拓扑与星型单点接地',
    summary: '模拟量感知回路与动力/普通数字回路物理电源分离，杜绝地环路传导干扰。',
    points: [
      '动力负载与普通数字 IO 使用脏电 24V，高精度传感器使用独立超低纹波干净电 24V',
      '两路电源负极在主接地铜排处做单点星型接地，杜绝线槽公用地环路',
      '强电动力电缆与弱电信号电缆必须严格分槽走线（物理间距 ≥ 200mm）',
    ],
  },
  {
    index: '02',
    badge: '屏蔽与电磁兼容',
    title: '360° 环抱屏蔽与高频接地',
    summary: '高频干扰由电缆表皮趋肤效应导出，杜绝细导线单点悬空天线效应。',
    points: [
      '伺服电机动力与编码器电缆屏蔽层采用金属导电马鞍夹 360° 环抱压接',
      '屏蔽层严禁拧成细导线单点接地，细线高频感抗会使接地失效并产生二次辐射',
      '现场双绞屏蔽线在各接线箱内保持屏蔽层连续性，严禁中途裸露或虚接',
    ],
  },
  {
    index: '03',
    badge: '跨任务并发约束',
    title: '跨周期写者排他与版本握手',
    summary: '严格恪守单一写者模式，多字段复合数据写入采用序列号版本控制。',
    points: [
      'TwinCAT 实时任务之间禁止随意跨任务直接覆写共享结构体变量',
      '上位机异步写与 PLC 周期读采用单一写者模式 + 偶数有效版本号握手',
      '写前版本号递增为奇数（锁定），写完毕后递增为偶数（就绪），读端双重校验防撕裂',
    ],
  },
  {
    index: '04',
    badge: '差分总线隔离',
    title: '差分总线双线全断与偏置防呆',
    summary: '针对广播配网设备现场单调，严禁只拔单线，必须切断双线防止单线虚压差误触发。',
    points: [
      'RS-485 接收端判定差模压差，单拔 A 线导致虚差模压差仍触发通信误操作',
      '现场排查单机配网时，必须实行 A/B 双线全断物理隔离规程或选用双极开关',
      '总线两端严谨配置 120Ω 终端匹配电阻，并加装失效保护偏置上下拉电阻网络',
    ],
  },
] as const

export default function CasesPage() {
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const motionMode = useMotionMode()

  usePageMeta('现场工程与问题排查', headingRef, motionMode === 'reduced' ? 0 : 1160)

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
          { autoAlpha: 0, y: 44 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: block,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          },
        )
      })
    },
    { scope: rootRef, dependencies: [motionMode], revertOnUpdate: true },
  )

  return (
    <main ref={rootRef} id="main-content" className="detail-page cases-page" tabIndex={-1}>
      <section className="detail-hero detail-hero--architecture cases-hero">
        <div className="detail-hero__index" aria-hidden="true">
          <span>05</span>
          <i />
          <small>05</small>
        </div>

        <div className="detail-hero__copy">
          <p className="eyebrow" data-detail-intro>现场工程 · 疑难问题排查</p>
          <h1 ref={headingRef} tabIndex={-1} data-detail-intro>
            现场工程与问题排查
          </h1>
          <p className="detail-hero__lead" data-detail-intro>
            以半导体晶圆电镀设备与自动化产线现场亲历的深水区故障为样本，复盘大功率伺服对模拟量瞬变干扰与双电源隔离、TwinCAT 跨任务并发读写撕裂握手、以及 RS-485 单线悬空虚压差广播误配址。
          </p>
          <div className="tag-row" data-detail-intro>
            <span>电磁兼容 / 伺服干扰</span>
            <span>双电源物理隔离</span>
            <span>TwinCAT 跨任务</span>
            <span>版本序列号握手</span>
            <span>RS-485 差分压差</span>
            <span>现场排错闭环</span>
          </div>
        </div>

        <div className="detail-hero__visual cases-visual" data-detail-block>
          <EngineeringCases embedded />
        </div>

        <div className="evidence-legend" data-detail-intro>
          <div>
            <span>01</span>
            <b>故障现场与异常现象</b>
            <small>复现条件与异常记录</small>
          </div>
          <div>
            <span>02</span>
            <b>排查验证与逻辑推演</b>
            <small>示波器测波与时序比对</small>
          </div>
          <div>
            <span>03</span>
            <b>硬件重构与代码协议闭环</b>
            <small>物理隔离与防呆设计</small>
          </div>
        </div>
      </section>

      <section className="cases-methods" aria-labelledby="cases-methods-title" data-detail-block>
        <div className="cases-methods__header">
          <p className="eyebrow">现场排查方法论 · 防呆体系</p>
          <h2 id="cases-methods-title">现场排查工程准则与防呆闭环体系</h2>
          <p>
            工业现场疑难问题往往跨越电气硬件、物理电磁环境与实时软件并发三大领域。
            将现场排障经验沉淀为系统性工程守则，实现源头防呆与标准化交付。
          </p>
        </div>

        <div className="cases-methods__grid">
          {fieldPrinciples.map((item) => (
            <article key={item.index} className="cases-method-card">
              <div className="cases-method-card__top">
                <span className="cases-method-card__badge">{item.badge}</span>
                <span className="cases-method-card__index">{item.index}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <ul className="cases-method-card__points">
                {item.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <nav className="project-pagination" aria-label="相邻能力项目">
        <IntentLink to="/vision">
          <span>上一页 · 04</span>
          <strong>OpenCV & HALCON 机器视觉工作台</strong>
        </IntentLink>
        <IntentLink to="/capabilities" className="project-pagination__home">
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
