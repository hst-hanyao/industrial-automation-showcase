import { lazy, Suspense, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CapabilityLink } from '../components/CapabilityLink'
import { IntentLink } from '../components/IntentLink'
import { getCapabilityNeighbors } from '../data/capabilities'
import { usePageMeta } from '../hooks/usePageMeta'
import { mountArchitecture } from '../plc/architecture-runtime'
import architectureMarkup from '../plc/architecture.html?raw'
import '../plc/architecture.css'
import '../styles/hmi.css'
import '../styles/plc-page.css'

const PlcPackmlPanel = lazy(() => import('./PlcPackmlPanel'))
const views = [
  { id: 'architecture', label: '架构总览' },
  { id: 'walkthrough', label: '单片执行流程' },
  { id: 'exchanges', label: 'Unit ↔ Module 交互' },
  { id: 'operations', label: '操作流程' },
  { id: 'framework', label: '框架细化' },
  { id: 'packml', label: 'PackML 状态机' },
] as const

export default function PlcPage() {
  const [search, setSearch] = useSearchParams()
  const maintenance = search.get('edit') === '1'
  const view = views.find(({ id }) => id === search.get('view'))?.id ?? 'architecture'
  const architectureRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const runtimeRef = useRef<ReturnType<typeof mountArchitecture> | null>(null)
  const neighbors = getCapabilityNeighbors('plc')
  usePageMeta('PLC 程序架构', headingRef)

  useLayoutEffect(() => {
    const root = architectureRef.current!
    root.innerHTML = architectureMarkup
    const runtime = mountArchitecture(root, { maintenance })
    runtimeRef.current = runtime
    return () => {
      runtime.destroy()
      runtimeRef.current = null
      root.replaceChildren()
    }
  }, [maintenance])

  useLayoutEffect(() => {
    if (view !== 'packml') runtimeRef.current?.setView(view)
  }, [view, maintenance])

  function selectView(id: typeof view) {
    const next = new URLSearchParams()
    if (id !== 'architecture') next.set('view', id)
    if (maintenance) next.set('edit', '1')
    setSearch(next, { preventScrollReset: true })
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const index = views.findIndex(({ id }) => id === view)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length
    const tab = views[next]
    if (!tab) return
    selectView(tab.id)
    event.currentTarget.querySelector<HTMLButtonElement>('#tab-' + tab.id)?.focus()
  }

  return (
    <main id="main-content" className="detail-page plc-page" tabIndex={-1}>
      <section className="detail-hero detail-hero--architecture">
        <div className="detail-hero__index" aria-hidden="true"><span>02</span><i /><small>04</small></div>
        <div className="detail-hero__copy">
          <p className="eyebrow">PLC · 核心控制程序</p>
          <h1 ref={headingRef} tabIndex={-1}>PLC 程序架构</h1>
          <p className="detail-hero__lead">以晶圆电镀设备为例，查看 PLC 任务划分、整机与腔室交接、设备操作流程及 PackML 状态流转。</p>
          <div className="tag-row">
            {['TwinCAT', 'IEC 61131-3', 'PackML'].map((tag) => <span key={tag} translate="no">{tag}</span>)}
          </div>
        </div>
        <div className="detail-hero__visual hmi-explorer plc-explorer">
          <div className="hmi-explorer__toolbar">
            <div><p className="hmi-explorer__eyebrow">程序架构 · 运行流程</p><h2>程序框架与运行流程</h2></div>
          </div>
          <div className="hmi-chain-tabs" role="tablist" aria-label="PLC 说明视图" onKeyDown={onTabKeyDown}>
            {views.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={'tab-' + id}
                aria-controls={id === 'packml' ? 'view-packml' : 'plc-view-panel'}
                aria-selected={id === view}
                tabIndex={id === view ? 0 : -1}
                onClick={() => selectView(id)}
              >{label}</button>
            ))}
          </div>
          <div
            ref={architectureRef}
            id="plc-view-panel"
            className="plc-architecture"
            role="tabpanel"
            aria-labelledby={'tab-' + view}
            tabIndex={0}
            hidden={view === 'packml'}
          />
          <div id="view-packml" role="tabpanel" aria-labelledby="tab-packml" hidden={view !== 'packml'}>
            {view === 'packml' && (
              <Suspense fallback={<p className="plc-panel-loading" role="status">正在加载 PackML 图表…</p>}>
                <PlcPackmlPanel />
              </Suspense>
            )}
          </div>
        </div>
        <div className="evidence-legend plc-reading-links">
          <Link className="text-link" to="/plc/case">补充阅读：独立的 TwinCAT 官方案例复盘 <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <nav className="project-pagination" aria-label="相邻能力项目">
        <CapabilityLink capability={neighbors.previous}>
          <span>上一页 · {neighbors.previous.order}</span>
          <strong>{neighbors.previous.primaryDocument?.title ?? neighbors.previous.title}</strong>
        </CapabilityLink>
        <IntentLink to="/capabilities" className="project-pagination__home">
          <span>能力全景</span>
          <strong>返回能力图谱</strong>
        </IntentLink>
        <CapabilityLink capability={neighbors.next}>
          <span>下一页 · {neighbors.next.order}</span>
          <strong>{neighbors.next.primaryDocument?.title ?? neighbors.next.title}</strong>
        </CapabilityLink>
      </nav>
    </main>
  )
}
