import { describe, expect, it } from 'vitest'
import { hmiCallChains, hmiEdges, hmiLayers, hmiNodes } from '../data/hmi-architecture'
import {
  getDefaultSnippetId,
  getHmiGraph,
  hmiExplorerReducer,
  initialHmiExplorerState,
  type HmiBrowseView,
  type HmiExplorerState,
} from './hmi-explorer'

const viewState = (browseView: HmiBrowseView): HmiExplorerState => ({ ...initialHmiExplorerState, browseView })
const open = (state: HmiExplorerState, nodeId: string): HmiExplorerState => {
  const snippetId = getDefaultSnippetId(nodeId, state.browseView)
  if (!snippetId) throw new Error(`No code for ${nodeId}`)
  return hmiExplorerReducer(state, { type: 'open', nodeId, snippetId })
}

describe('HMI graph selection', () => {
  it('starts with one code representative per group and no external systems in the compact graph', () => {
    const graph = getHmiGraph(initialHmiExplorerState)
    expect(graph.nodes.map((node) => node.id)).toEqual(hmiLayers.flatMap((layer) => layer.representativeNodeIds))
    expect(graph.nodes).toHaveLength(6)
    expect(graph.nodes.every((node) => node.kind === 'code')).toBe(true)
    const visible = new Set(graph.nodes.map((node) => node.id))
    expect(graph.edges.every((edge) => visible.has(edge.from) && visible.has(edge.to))).toBe(true)
  })

  it('expands only the requested group and returns to the same representatives when collapsed', () => {
    const expanded = hmiExplorerReducer(initialHmiExplorerState, { type: 'toggle-group', groupId: 'data' })
    const graph = getHmiGraph(expanded)
    expect(graph.nodes.filter((node) => node.layerId === 'data').map((node) => node.id)).toEqual([
      'plc-client', 'ads-client', 'sqlite-repo', 'history-repo',
    ])
    expect(graph.nodes.filter((node) => node.layerId !== 'data')).toHaveLength(5)
    const collapsed = hmiExplorerReducer(expanded, { type: 'toggle-group', groupId: 'data' })
    expect(getHmiGraph(collapsed)).toEqual(getHmiGraph(initialHmiExplorerState))
  })

  it('renders all code nodes when every group is expanded while keeping external boundaries separate', () => {
    const state = { ...initialHmiExplorerState, expandedGroupIds: hmiLayers.map((layer) => layer.id) }
    expect(getHmiGraph(state).nodes.map((node) => node.id)).toEqual(hmiNodes.filter((node) => node.kind === 'code').map((node) => node.id))
    expect(getHmiGraph(state).nodes).toHaveLength(17)
  })

  it('shows exactly 20 nodes and 26 evidenced relations in the explicit full view', () => {
    const graph = getHmiGraph(viewState({ kind: 'full' }))
    expect(graph.nodes).toHaveLength(20)
    expect(graph.edges).toHaveLength(26)
    expect(graph.nodes).toEqual(hmiNodes)
    expect(graph.edges).toEqual(hmiEdges)
  })

  it.each(hmiCallChains.map((chain) => [chain.id, chain] as const))('filters %s to its actual nodes and relations', (chainId, chain) => {
    const graph = getHmiGraph(viewState({ kind: 'chain', chainId }))
    expect(graph.nodes.map((node) => node.id)).toEqual(chain.nodeIds)
    expect(graph.edges.map((edge) => edge.id)).toEqual(chain.edgeIds)
  })

  it('retains the entire selected chain while code is open', () => {
    const before = viewState({ kind: 'chain', chainId: 'status' })
    const reading = open(before, 'ads-client')
    expect(getHmiGraph(reading)).toEqual(getHmiGraph(before))
    expect(reading.activeSnippetId).toBe('ads-read')
  })

  it.each(['overview', 'full'] as const)('focuses %s reading on the selected node and only its direct relations', (kind) => {
    const reading = open(viewState({ kind }), 'ads-client')
    const graph = getHmiGraph(reading)
    expect(graph.nodes.map((node) => node.id)).toEqual(['plc-client', 'ads-client', 'plc', 'raw-snapshot'])
    expect(graph.edges.map((edge) => edge.id)).toEqual(['client-ads', 'ads-plc-read', 'ads-raw', 'ads-plc-write'])
    expect(graph.edges.every((edge) => edge.from === 'ads-client' || edge.to === 'ads-client')).toBe(true)
  })

  it('handles stale unknown graph selections without inventing nodes or relations', () => {
    expect(getHmiGraph(viewState({ kind: 'chain', chainId: 'missing' }))).toEqual({ nodes: [], edges: [] })
    expect(getHmiGraph({ ...initialHmiExplorerState, selectedNodeId: 'missing' })).toEqual({ nodes: [], edges: [] })
  })
})

describe('HMI source defaults and state transitions', () => {
  it('selects task-specific main methods without relying on edge order', () => {
    expect(getDefaultSnippetId('ads-client', { kind: 'overview' })).toBe('ads-read')
    expect(getDefaultSnippetId('ads-client', { kind: 'chain', chainId: 'status' })).toBe('ads-read')
    expect(getDefaultSnippetId('ads-client', { kind: 'chain', chainId: 'manual' })).toBe('ads-manual')
    expect(getDefaultSnippetId('ui-snapshot', { kind: 'chain', chainId: 'status' })).toBe('shell-ui')
    expect(getDefaultSnippetId('main-window', { kind: 'chain', chainId: 'status' })).toBe('window-binding')
    expect(getDefaultSnippetId('plc', { kind: 'full' })).toBeUndefined()
    expect(getDefaultSnippetId('missing', { kind: 'overview' })).toBeUndefined()
  })

  it('locks opened source while another node is hovered or focused', () => {
    const reading = open(initialHmiExplorerState, 'main-window')
    const preview = hmiExplorerReducer(reading, { type: 'preview', nodeId: 'shell' })
    expect(preview.previewNodeId).toBe('shell')
    expect(preview.selectedNodeId).toBe('main-window')
    expect(preview.activeSnippetId).toBe('window-init')
    expect(hmiExplorerReducer(preview, { type: 'preview', nodeId: null }).selectedNodeId).toBe('main-window')
  })

  it('switches node and source together without changing the browsing context', () => {
    const expanded = hmiExplorerReducer(initialHmiExplorerState, { type: 'toggle-group', groupId: 'entry' })
    const first = open(expanded, 'main-window')
    const second = open(first, 'shell')
    expect(second.browseView).toEqual({ kind: 'overview' })
    expect(second.expandedGroupIds).toEqual(['entry'])
    expect(second.selectedNodeId).toBe('shell')
    expect(second.activeSnippetId).toBe('shell-read')
  })

  it('changes methods only within the selected node', () => {
    const reading = open(initialHmiExplorerState, 'ads-client')
    const changed = hmiExplorerReducer(reading, { type: 'snippet', snippetId: 'ads-coherence' })
    expect(changed.activeSnippetId).toBe('ads-coherence')
    expect(changed.selectedNodeId).toBe('ads-client')
    expect(hmiExplorerReducer(changed, { type: 'snippet', snippetId: 'recipe-save' })).toBe(changed)
    expect(hmiExplorerReducer(initialHmiExplorerState, { type: 'snippet', snippetId: 'ads-read' })).toBe(initialHmiExplorerState)
  })

  it('closes reading and restores the exact expanded overview graph', () => {
    const before = hmiExplorerReducer(initialHmiExplorerState, { type: 'toggle-group', groupId: 'views' })
    const reading = hmiExplorerReducer(open(before, 'history-view'), { type: 'preview', nodeId: 'shell' })
    const closed = hmiExplorerReducer(reading, { type: 'close' })
    expect(closed).toEqual(before)
    expect(getHmiGraph(closed)).toEqual(getHmiGraph(before))
  })

  it.each(['full', 'chain'] as const)('preserves the %s view after closing reading', (kind) => {
    const before = kind === 'full' ? viewState({ kind }) : viewState({ kind, chainId: 'status' })
    expect(hmiExplorerReducer(open(before, 'ads-client'), { type: 'close' })).toEqual(before)
  })

  it('exits reading when a new view is explicitly selected while preserving group choices', () => {
    const before = { ...initialHmiExplorerState, expandedGroupIds: ['data'] }
    const reading = hmiExplorerReducer(open(before, 'ads-client'), { type: 'preview', nodeId: 'shell' })
    const next = hmiExplorerReducer(reading, { type: 'view', view: { kind: 'chain', chainId: 'recipe' } })
    expect(next).toEqual({ ...before, browseView: { kind: 'chain', chainId: 'recipe' } })
    const overview = hmiExplorerReducer(next, { type: 'view', view: { kind: 'overview' } })
    expect(overview).toEqual(before)
  })

  it('rejects unknown IDs, external code requests and source belonging to another node', () => {
    for (const action of [
      { type: 'open', nodeId: 'missing', snippetId: 'ads-read' },
      { type: 'open', nodeId: 'plc', snippetId: 'ads-read' },
      { type: 'open', nodeId: 'main-window', snippetId: 'ads-read' },
      { type: 'view', view: { kind: 'chain', chainId: 'missing' } },
      { type: 'toggle-group', groupId: 'missing' },
      { type: 'preview', nodeId: 'missing' },
    ] as const) expect(hmiExplorerReducer(initialHmiExplorerState, action)).toBe(initialHmiExplorerState)
    const chain = viewState({ kind: 'chain', chainId: 'recipe' })
    expect(hmiExplorerReducer(chain, { type: 'open', nodeId: 'ads-client', snippetId: 'ads-read' })).toBe(chain)
  })

  it('keeps group choices stable during reading and in non-overview views', () => {
    const reading = open(initialHmiExplorerState, 'main-window')
    const full = viewState({ kind: 'full' })
    expect(hmiExplorerReducer(reading, { type: 'toggle-group', groupId: 'entry' })).toBe(reading)
    expect(hmiExplorerReducer(full, { type: 'toggle-group', groupId: 'entry' })).toBe(full)
  })

  it('does not mutate previous states or their expanded-group arrays', () => {
    const before = Object.freeze({ ...initialHmiExplorerState, expandedGroupIds: Object.freeze(['entry']) })
    const expanded = hmiExplorerReducer(before, { type: 'toggle-group', groupId: 'data' })
    const reading = open(expanded, 'ads-client')
    const switched = hmiExplorerReducer(reading, { type: 'view', view: { kind: 'chain', chainId: 'history' } })
    expect(before.expandedGroupIds).toEqual(['entry'])
    expect(expanded.expandedGroupIds).toEqual(['entry', 'data'])
    expect(reading.selectedNodeId).toBe('ads-client')
    expect(switched.selectedNodeId).toBeNull()
  })
})
