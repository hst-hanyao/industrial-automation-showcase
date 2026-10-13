import { useEffect, useId, useLayoutEffect, useMemo, useReducer, useRef, useState, type FocusEvent, type PointerEvent } from 'react'
import { hmiCallChains, hmiCodeSnippets, hmiLayers, hmiNodes, hmiSourceSnapshot, type HmiEdge, type HmiNode } from '../data/hmi-architecture'
import { useMotionMode } from '../features/motion/useMotionMode'
import { getDefaultSnippetId, getHmiGraph, hmiExplorerReducer, initialHmiExplorerState, type HmiBrowseView } from '../lib/hmi-explorer'
import { ScrollTrigger } from '../lib/gsap'
import { HmiSourceReader } from './HmiSourceReader'
import { SourceCode } from './SourceCode'
import '../styles/hmi.css'

const edgeLabels: Record<HmiEdge['kind'], string> = { call: '方法调用', projection: '数据投影', binding: 'XAML 绑定', implementation: '接口实现' }
interface DiagramPath { readonly edge: HmiEdge; readonly path: string }
interface ReadingReturnContext { readonly triggerId: string; readonly pageX: number; readonly pageY: number; readonly graphX: number; readonly graphY: number }
interface HmiArchitectureExplorerProps { readonly chainRequest?: { readonly chainId: string; readonly requestId: number } }

export function HmiArchitectureExplorer({ chainRequest }: HmiArchitectureExplorerProps = {}) {
  const [state, dispatch] = useReducer(hmiExplorerReducer, initialHmiExplorerState)
  const [paths, setPaths] = useState<readonly DiagramPath[]>([])
  const [mobileGraphExpanded, setMobileGraphExpanded] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const diagramRef = useRef<HTMLDivElement>(null)
  const graphScrollRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLElement>())
  const chainButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const readerRef = useRef<HTMLElement>(null)
  const readerTitleRef = useRef<HTMLHeadingElement>(null)
  const returnContextRef = useRef<ReadingReturnContext | null>(null)
  const pendingRestoreRef = useRef(false)
  const prefix = useId().replaceAll(':', '')
  const readerId = `${prefix}-reader`
  const markerId = `${prefix}-arrow`
  const motionMode = useMotionMode()
  const reading = state.selectedNodeId !== null
  const overview = !reading && state.browseView.kind === 'overview'
  const graph = useMemo(() => getHmiGraph(state), [state])
  const graphKey = `${overview}:${reading}:${graph.nodes.map((node) => node.id).join(',')}:${graph.edges.map((edge) => edge.id).join(',')}`
  const selectedNode = hmiNodes.find((node) => node.id === state.selectedNodeId)
  const selectedSnippet = hmiCodeSnippets.find((snippet) => snippet.id === state.activeSnippetId)
  const previewSnippet = hmiCodeSnippets.find((snippet) => snippet.id === (state.previewNodeId ? getDefaultSnippetId(state.previewNodeId, state.browseView) : undefined))
  const activeChainId = state.browseView.kind === 'chain' ? state.browseView.chainId : null
  const activeChain = hmiCallChains.find((chain) => chain.id === activeChainId)
  const contextLabel = activeChain?.label ?? (reading ? '当前模块的直接关系' : state.browseView.kind === 'full' ? '完整模块与真实关系' : '六个职责分组 · 不表示执行顺序')
  const focusedNodeId = state.previewNodeId ?? state.selectedNodeId
  const requestedChainId = chainRequest?.chainId
  const requestedChainRevision = chainRequest?.requestId

  useEffect(() => {
    if (!requestedChainId || requestedChainRevision === undefined || !hmiCallChains.some((chain) => chain.id === requestedChainId)) return
    returnContextRef.current = null
    pendingRestoreRef.current = false
    dispatch({ type: 'view', view: { kind: 'chain', chainId: requestedChainId } })
    const frame = requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
      chainButtonRefs.current.get(requestedChainId)?.focus({ preventScroll: true })
      graphScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [requestedChainId, requestedChainRevision])

  useLayoutEffect(() => {
    const diagram = diagramRef.current
    if (!diagram || overview) return
    let frame = 0
    let disposed = false
    const measure = () => {
      const bounds = diagram.getBoundingClientRect()
      const rectangles = new Map(graph.nodes.map((node) => [node.id, nodeRefs.current.get(node.id)?.getBoundingClientRect()]))
      const nextPaths = graph.edges.flatMap((edge, index): DiagramPath[] => {
        const from = rectangles.get(edge.from)
        const to = rectangles.get(edge.to)
        if (!from || !to || !from.width || !to.width) return []
        const siblings = graph.edges.filter((item) => item.from === edge.from && item.to === edge.to)
        const offset = (siblings.indexOf(edge) - (siblings.length - 1) / 2) * 7
        const sameRow = Math.abs(from.top - to.top) < 12
        const forward = to.top > from.top
        const x1 = from.left + from.width / 2 - bounds.left + offset
        const x2 = to.left + to.width / 2 - bounds.left + offset
        const y1 = (sameRow || !forward ? from.top : from.bottom) - bounds.top
        const y2 = (sameRow || forward ? to.top : to.bottom) - bounds.top
        let path: string
        if (sameRow) {
          const channel = Math.min(y1, y2) - 12 - (index % 3) * 7
          path = `M ${x1} ${y1} V ${channel} H ${x2} V ${y2}`
        } else if (Math.abs(from.top - to.top) > Math.max(from.height, to.height) + 70) {
          const channel = bounds.width - 10 - (index % 4) * 7
          const start = y1 + (forward ? 14 : -14)
          const end = y2 + (forward ? -14 : 14)
          path = `M ${x1} ${y1} V ${start} H ${channel} V ${end} H ${x2} V ${y2}`
        } else {
          const midpoint = (y1 + y2) / 2 + offset
          path = `M ${x1} ${y1} V ${midpoint} H ${x2} V ${y2}`
        }
        return [{ edge, path }]
      })
      setPaths(nextPaths)
    }
    const schedule = () => { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(diagram)
    graph.nodes.forEach((node) => { const element = nodeRefs.current.get(node.id); if (element) observer.observe(element) })
    schedule()
    void document.fonts.ready.then(schedule)
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect() }
    // IDs describe the mounted graph; hover changes only line emphasis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey])

  useLayoutEffect(() => {
    if (reading) {
      readerTitleRef.current?.focus({ preventScroll: true })
      readerRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
      return
    }
    if (!pendingRestoreRef.current) return
    pendingRestoreRef.current = false
    const context = returnContextRef.current
    returnContextRef.current = null
    if (!context) return
    const trigger = document.getElementById(context.triggerId)
    trigger?.focus({ preventScroll: true })
    const restore = () => {
      if (trigger && document.activeElement !== trigger) return
      graphScrollRef.current?.scrollTo({ left: context.graphX, top: context.graphY, behavior: 'instant' })
      window.scrollTo({ left: context.pageX, top: context.pageY, behavior: 'instant' })
    }
    restore()
    const timer = window.setTimeout(restore, motionMode === 'reduced' ? 0 : 240)
    return () => window.clearTimeout(timer)
  }, [reading, state.selectedNodeId, motionMode])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let lastHeight = -1
    let frame = 0
    const observer = new ResizeObserver(() => {
      const height = root.getBoundingClientRect().height
      if (Math.abs(height - lastHeight) < 1) return
      lastHeight = height
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => ScrollTrigger.refresh())
    })
    observer.observe(root)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])

  const openNode = (node: HmiNode, trigger: HTMLButtonElement) => {
    const snippetId = getDefaultSnippetId(node.id, state.browseView)
    if (!snippetId) return
    if (!reading) returnContextRef.current = { triggerId: trigger.id, pageX: window.scrollX, pageY: window.scrollY, graphX: graphScrollRef.current?.scrollLeft ?? 0, graphY: graphScrollRef.current?.scrollTop ?? 0 }
    setMobileGraphExpanded(false)
    dispatch({ type: 'open', nodeId: node.id, snippetId })
  }
  const closeReader = () => { pendingRestoreRef.current = true; setMobileGraphExpanded(false); dispatch({ type: 'close' }) }
  const changeView = (view: HmiBrowseView) => {
    returnContextRef.current = null
    pendingRestoreRef.current = false
    setMobileGraphExpanded(false)
    dispatch({ type: 'view', view })
    graphScrollRef.current?.scrollTo({ left: 0, top: 0, behavior: 'instant' })
  }
  const registerNode = (nodeId: string, element: HTMLElement | null) => { if (element) nodeRefs.current.set(nodeId, element); else nodeRefs.current.delete(nodeId) }
  const nodeEvents = (nodeId: string) => ({
    onPointerEnter: (event: PointerEvent<HTMLElement>) => { if (event.pointerType === 'mouse') dispatch({ type: 'preview', nodeId }) },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => { if (!event.currentTarget.contains(document.activeElement)) dispatch({ type: 'preview', nodeId: null }) },
    onFocusCapture: () => dispatch({ type: 'preview', nodeId }),
    onBlurCapture: (event: FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(':hover')) dispatch({ type: 'preview', nodeId: null }) },
  })
  const renderNode = (node: HmiNode, compact = false) => (
    <article key={node.id} ref={(element) => registerNode(node.id, element)} data-node-id={node.id} className={`hmi-node${compact ? ' hmi-node--compact' : ''}${node.kind === 'external' ? ' hmi-node--external' : ''}${state.selectedNodeId === node.id ? ' is-selected' : ''}${state.previewNodeId === node.id ? ' is-previewed' : ''}`} {...nodeEvents(node.id)}>
      {node.kind === 'code' ? <button id={`${prefix}-node-${node.id}`} type="button" className="hmi-node__open" aria-label={`查看 ${node.label} 代码`} aria-expanded={state.selectedNodeId === node.id} aria-controls={readerId} onClick={(event) => openNode(node, event.currentTarget)}><span><strong>{node.roleTitle}</strong><span className="hmi-node__class" translate="no">{node.label}</span></span><span className="hmi-node__action">{state.selectedNodeId === node.id ? '正在查看' : '查看代码'}<span aria-hidden="true"> ↗</span></span></button> : <div className="hmi-node__external"><strong>{node.roleTitle}</strong><span translate="no">{node.label}</span><small>外部系统</small></div>}
      {!compact ? <p>{node.description}</p> : null}
    </article>
  )

  return (
    <section ref={rootRef} className={`hmi-explorer${reading ? ' is-reading' : ''}${overview ? ' is-overview' : ''}`} data-motion={motionMode} data-mobile-expanded={mobileGraphExpanded} aria-label="上位机架构与真实源码探索" onKeyDown={(event) => { if (event.key === 'Escape' && reading) { event.preventDefault(); closeReader() } }}>
      <header className="hmi-explorer__toolbar"><div><span className="hmi-explorer__eyebrow">ARCHITECTURE / SOURCE</span><h2>从架构，追到真实代码。</h2></div><p>{reading ? '代码已固定 · 点击节点切换' : '悬停预览 · 点击阅读'}</p></header>
      <nav className="hmi-chain-tabs" aria-label="架构视图和关键调用链">
        <button type="button" aria-pressed={state.browseView.kind === 'overview'} onClick={() => changeView({ kind: 'overview' })}>分组总览</button>
        {hmiCallChains.map((chain, index) => <button key={chain.id} ref={(element) => { if (element) chainButtonRefs.current.set(chain.id, element); else chainButtonRefs.current.delete(chain.id) }} type="button" aria-pressed={activeChain?.id === chain.id} onClick={() => changeView({ kind: 'chain', chainId: chain.id })}><span aria-hidden="true">0{index + 1}</span>{chain.label}</button>)}
        <button type="button" className="hmi-chain-tabs__full" aria-pressed={state.browseView.kind === 'full'} onClick={() => changeView({ kind: 'full' })}>展开完整架构 <span aria-hidden="true">↗</span></button>
      </nav>
      {reading ? <div className="hmi-mobile-context"><span>{contextLabel}</span><button type="button" aria-expanded={mobileGraphExpanded} aria-controls={`${prefix}-graph`} onClick={() => setMobileGraphExpanded(!mobileGraphExpanded)}>{mobileGraphExpanded ? '收起关系图' : '查看关系图'}</button></div> : null}
      <div className="hmi-explorer__workspace">
        <div ref={graphScrollRef} className="hmi-graph-scroll" id={`${prefix}-graph`} tabIndex={overview ? undefined : 0} role={overview ? undefined : 'region'} aria-label={overview ? undefined : '架构关系图，可滚动查看'}>
          <div ref={diagramRef} className="hmi-diagram">
            {!reading && previewSnippet ? <div className="hmi-code-ghost" aria-hidden="true"><p translate="no">{previewSnippet.file} / {previewSnippet.symbol}</p><SourceCode snippet={previewSnippet} preview /></div> : null}
            {!overview ? <svg className="hmi-diagram__edges" aria-hidden="true"><defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" overflow="visible"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" stroke="#fff" strokeWidth="3" paintOrder="stroke" /></marker></defs>{paths.map(({ edge, path }) => <g key={edge.id} className={`hmi-edge hmi-edge--${edge.kind}${activeChain || edge.from === focusedNodeId || edge.to === focusedNodeId ? ' is-highlighted' : ''}`}><path className="hmi-edge__halo" d={path} aria-hidden="true" /><path d={path} markerEnd={`url(#${markerId})`} /></g>)}</svg> : null}
            {overview ? <div className="hmi-group-grid">{hmiLayers.map((layer, index) => {
              const groupNodes = hmiNodes.filter((node) => node.layerId === layer.id && node.kind === 'code')
              const expanded = state.expandedGroupIds.includes(layer.id)
              const representatives = groupNodes.filter((node) => layer.representativeNodeIds.includes(node.id))
              const others = groupNodes.filter((node) => !layer.representativeNodeIds.includes(node.id))
              return <article className="hmi-group" key={layer.id}><header><div><h3><span aria-hidden="true">0{index + 1}</span>{layer.label}</h3><p>{layer.caption}</p></div>{others.length ? <button type="button" aria-expanded={expanded} aria-controls={`${prefix}-group-${layer.id}`} onClick={() => dispatch({ type: 'toggle-group', groupId: layer.id })}>{expanded ? '收起' : '展开'} <span>{groupNodes.length}</span></button> : <span className="hmi-group__count">{groupNodes.length} 模块</span>}</header>{representatives.map((node) => renderNode(node, true))}<div id={`${prefix}-group-${layer.id}`} hidden={!expanded} className="hmi-group__expanded">{expanded ? others.map((node) => renderNode(node, true)) : null}</div></article>
            })}</div> : <><div className="hmi-graph-heading"><strong>{contextLabel}</strong><span>{graph.nodes.length} 节点 · {graph.edges.length} 关系</span></div><div className="hmi-flow-nodes">{graph.nodes.map((node) => renderNode(node))}</div></>}
          </div>
        </div>
        {reading && selectedNode && selectedSnippet ? <HmiSourceReader id={readerId} node={selectedNode} snippet={selectedSnippet} snippets={hmiCodeSnippets.filter((snippet) => selectedNode.snippetIds.includes(snippet.id))} contextLabel={contextLabel} readerRef={readerRef} titleRef={readerTitleRef} onSnippet={(snippetId) => dispatch({ type: 'snippet', snippetId })} onClose={closeReader} /> : null}
      </div>
      {overview ? <div className="hmi-external-boundary"><span>外部边界</span>{hmiNodes.filter((node) => node.kind === 'external').map((node) => <span key={node.id} translate="no">{node.label}</span>)}<small>通过通讯与持久化模块访问</small></div> : null}
      <footer className="hmi-explorer__footer"><div className="hmi-edge-key" aria-label="连线含义">{(Object.entries(edgeLabels) as [HmiEdge['kind'], string][]).map(([kind, label]) => <span key={kind}><i className={`hmi-edge-key__line hmi-edge-key__line--${kind}`} aria-hidden="true" />{label}</span>)}</div><p>{hmiSourceSnapshot.project} · 源码 {hmiSourceSnapshot.capturedAt.slice(0, 10)}</p></footer>
      {!overview ? <details className="hmi-chain-relations"><summary>逐条查看关系与源码依据（{graph.edges.length}）</summary>{activeChain ? <p>{activeChain.description}</p> : null}<ul>{graph.edges.map((edge) => {
        const snippet = hmiCodeSnippets.find((item) => item.id === edge.evidenceSnippetId)
        return <li key={edge.id}><span translate="no">{hmiNodes.find((node) => node.id === edge.from)?.label} → {hmiNodes.find((node) => node.id === edge.to)?.label}</span><b>{edgeLabels[edge.kind]}</b><small translate="no">{snippet?.file}:L{snippet?.startLine}</small></li>
      })}</ul></details> : null}
    </section>
  )
}
