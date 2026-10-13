import { hmiCallChains, hmiEdges, hmiLayers, hmiNodes, type HmiEdge, type HmiNode } from '../data/hmi-architecture'

export type HmiBrowseView =
  | { readonly kind: 'overview' }
  | { readonly kind: 'full' }
  | { readonly kind: 'chain'; readonly chainId: string }

export interface HmiExplorerState {
  readonly browseView: HmiBrowseView
  readonly previewNodeId: string | null
  readonly selectedNodeId: string | null
  readonly activeSnippetId: string | null
  readonly expandedGroupIds: readonly string[]
}

export type HmiExplorerAction =
  | { type: 'preview'; nodeId: string | null }
  | { type: 'open'; nodeId: string; snippetId: string }
  | { type: 'close' }
  | { type: 'view'; view: HmiBrowseView }
  | { type: 'toggle-group'; groupId: string }
  | { type: 'snippet'; snippetId: string }

export const initialHmiExplorerState: HmiExplorerState = {
  browseView: { kind: 'overview' },
  previewNodeId: null,
  selectedNodeId: null,
  activeSnippetId: null,
  expandedGroupIds: [],
}

const nodeById = new Map(hmiNodes.map((node) => [node.id, node]))
const edgeById = new Map(hmiEdges.map((edge) => [edge.id, edge]))
const chainById = new Map(hmiCallChains.map((chain) => [chain.id, chain]))

/** Select the task's main method explicitly, without guessing from edge order. */
export function getDefaultSnippetId(nodeId: string, browseView: HmiBrowseView): string | undefined {
  const node = nodeById.get(nodeId)
  if (!node || node.kind === 'external') return undefined
  if (browseView.kind === 'chain') {
    return chainById.get(browseView.chainId)?.defaultSnippetByNode[nodeId] ?? node.defaultSnippetId
  }
  return node.defaultSnippetId
}

/** Returned arrays contain only visible nodes and their relevant, evidenced edges. */
export function getHmiGraph(state: HmiExplorerState): { nodes: HmiNode[]; edges: HmiEdge[] } {
  if (state.browseView.kind === 'chain') {
    const chain = chainById.get(state.browseView.chainId)
    if (!chain) return { nodes: [], edges: [] }
    return {
      nodes: chain.nodeIds.flatMap((id) => nodeById.get(id) ?? []),
      edges: chain.edgeIds.flatMap((id) => edgeById.get(id) ?? []),
    }
  }

  if (state.selectedNodeId !== null) {
    if (!nodeById.has(state.selectedNodeId)) return { nodes: [], edges: [] }
    const edges = hmiEdges.filter((edge) => edge.from === state.selectedNodeId || edge.to === state.selectedNodeId)
    const ids = new Set([state.selectedNodeId, ...edges.flatMap((edge) => [edge.from, edge.to])])
    return { nodes: hmiNodes.filter((node) => ids.has(node.id)), edges }
  }

  if (state.browseView.kind === 'full') return { nodes: [...hmiNodes], edges: [...hmiEdges] }

  const representatives = new Set(hmiLayers.flatMap((layer) => layer.representativeNodeIds))
  const expandedGroups = new Set(state.expandedGroupIds)
  const nodes = hmiNodes.filter((node) => node.kind === 'code'
    && (representatives.has(node.id) || expandedGroups.has(node.layerId)))
  const visibleIds = new Set(nodes.map((node) => node.id))
  return {
    nodes,
    edges: hmiEdges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
  }
}

export function hmiExplorerReducer(state: HmiExplorerState, action: HmiExplorerAction): HmiExplorerState {
  switch (action.type) {
    case 'preview':
      return action.nodeId === null || nodeById.has(action.nodeId)
        ? { ...state, previewNodeId: action.nodeId }
        : state
    case 'open': {
      const node = nodeById.get(action.nodeId)
      const chain = state.browseView.kind === 'chain' ? chainById.get(state.browseView.chainId) : null
      if (!node || node.kind !== 'code' || !node.snippetIds.includes(action.snippetId)
        || (chain && !chain.nodeIds.includes(node.id))) return state
      return { ...state, selectedNodeId: node.id, activeSnippetId: action.snippetId }
    }
    case 'close':
      return { ...state, selectedNodeId: null, activeSnippetId: null, previewNodeId: null }
    case 'view':
      if (action.view.kind === 'chain' && !chainById.has(action.view.chainId)) return state
      return { ...state, browseView: action.view, selectedNodeId: null, activeSnippetId: null, previewNodeId: null }
    case 'toggle-group':
      if (state.browseView.kind !== 'overview' || state.selectedNodeId !== null
        || !hmiLayers.some((layer) => layer.id === action.groupId)) return state
      return {
        ...state,
        expandedGroupIds: state.expandedGroupIds.includes(action.groupId)
          ? state.expandedGroupIds.filter((id) => id !== action.groupId)
          : [...state.expandedGroupIds, action.groupId],
      }
    case 'snippet': {
      const node = state.selectedNodeId === null ? undefined : nodeById.get(state.selectedNodeId)
      return node?.snippetIds.includes(action.snippetId) ? { ...state, activeSnippetId: action.snippetId } : state
    }
  }
}
