import { describe, expect, it } from 'vitest'
import {
  hmiCallChains,
  hmiCodeSnippets,
  hmiEdges,
  hmiLayers,
  hmiNodes,
  hmiSourceSnapshot,
} from './hmi-architecture'

describe('HMI source-backed architecture', () => {
  it('gives each responsibility group one real code representative', () => {
    const nodes = new Map(hmiNodes.map((node) => [node.id, node]))
    expect(hmiLayers).toHaveLength(6)
    for (const layer of hmiLayers) {
      expect(layer.representativeNodeIds, layer.id).toHaveLength(1)
      const node = nodes.get(layer.representativeNodeIds[0] ?? '')
      expect(node?.layerId, layer.id).toBe(layer.id)
      expect(node?.kind, layer.id).toBe('code')
    }
  })

  it('defines readable responsibility titles and legal source defaults for every code node', () => {
    for (const node of hmiNodes) {
      expect(node.roleTitle, node.id).toMatch(/[\u4e00-\u9fff]/)
      if (node.kind === 'external') {
        expect(node.defaultSnippetId, node.id).toBeUndefined()
      } else {
        expect(node.defaultSnippetId, node.id).toBeDefined()
        expect(node.snippetIds, node.id).toContain(node.defaultSnippetId)
      }
    }
    const nodes = new Map(hmiNodes.map((node) => [node.id, node]))
    for (const chain of hmiCallChains) {
      const codeNodes = chain.nodeIds.filter((id) => nodes.get(id)?.kind === 'code')
      expect(Object.keys(chain.defaultSnippetByNode).sort(), chain.id).toEqual([...codeNodes].sort())
      for (const id of codeNodes) {
        expect(nodes.get(id)?.snippetIds, `${chain.id}/${id}`).toContain(chain.defaultSnippetByNode[id])
      }
    }
  })

  it('resolves every node, edge and evidence reference without duplicate IDs', () => {
    for (const collection of [hmiLayers, hmiNodes, hmiEdges, hmiCallChains, hmiCodeSnippets]) {
      expect(new Set(collection.map((item) => item.id)).size).toBe(collection.length)
    }

    const layerIds = new Set(hmiLayers.map((layer) => layer.id))
    const nodeIds = new Set(hmiNodes.map((node) => node.id))
    const snippetIds = new Set(hmiCodeSnippets.map((snippet) => snippet.id))
    const assignedSnippets = new Set(hmiNodes.flatMap((node) => node.snippetIds))

    for (const node of hmiNodes) {
      expect(layerIds.has(node.layerId), node.id).toBe(true)
      expect(node.kind === 'code' ? node.snippetIds.length > 0 : node.snippetIds.length === 0, node.id).toBe(true)
      for (const snippetId of node.snippetIds) expect(snippetIds.has(snippetId), node.id).toBe(true)
    }
    for (const edge of hmiEdges) {
      expect(nodeIds.has(edge.from) && nodeIds.has(edge.to), edge.id).toBe(true)
      expect(snippetIds.has(edge.evidenceSnippetId), edge.id).toBe(true)
      expect(edge.from, edge.id).not.toBe(edge.to)
    }
    expect(assignedSnippets).toEqual(snippetIds)
  })

  it('keeps four connected evidence subgraphs, including return and binding paths', () => {
    expect(hmiCallChains.map((chain) => chain.id)).toEqual(['status', 'manual', 'recipe', 'history'])
    const edges = new Map(hmiEdges.map((edge) => [edge.id, edge]))

    for (const chain of hmiCallChains) {
      const nodes = new Set(chain.nodeIds)
      expect(nodes.size, chain.id).toBe(chain.nodeIds.length)
      expect(new Set(chain.edgeIds).size, chain.id).toBe(chain.edgeIds.length)
      const adjacency = new Map(chain.nodeIds.map((id) => [id, new Set<string>()]))
      for (const edgeId of chain.edgeIds) {
        const edge = edges.get(edgeId)
        expect(edge, edgeId).toBeDefined()
        if (!edge) continue
        expect(nodes.has(edge.from) && nodes.has(edge.to), edgeId).toBe(true)
        adjacency.get(edge.from)?.add(edge.to)
        adjacency.get(edge.to)?.add(edge.from)
      }
      const pending = chain.nodeIds.slice(0, 1)
      const visited = new Set<string>()
      while (pending.length > 0) {
        const nodeId = pending.pop()
        if (!nodeId || visited.has(nodeId)) continue
        visited.add(nodeId)
        pending.push(...(adjacency.get(nodeId) ?? []))
      }
      expect(visited, chain.id).toEqual(nodes)
    }
  })

  it('retains source-relative provenance and bounded original line excerpts', () => {
    expect(hmiSourceSnapshot.project).toBe('WaferElectroplatingMachine')
    expect(hmiSourceSnapshot.revision).toMatch(/^[a-f0-9]{40}$/)
    expect(hmiSourceSnapshot.note).toContain('工作区变化')
    for (const snippet of hmiCodeSnippets) {
      expect(snippet.file, snippet.id).toMatch(/^[A-Za-z][A-Za-z0-9/]*\.xaml(?:\.cs)?$|^[A-Za-z][A-Za-z0-9/]*\.cs$/)
      expect(snippet.file, snippet.id).not.toMatch(/(?:Password|Login|UserRepository|ConnectionFactory|\.config)/i)
      expect(Number.isInteger(snippet.startLine) && snippet.startLine > 0, snippet.id).toBe(true)
      expect(snippet.lines.length, snippet.id).toBeGreaterThan(0)
      expect(snippet.lines.length, snippet.id).toBeLessThanOrEqual(80)
      expect(snippet.lines.some((line) => line.trim().length > 0), snippet.id).toBe(true)
      expect(snippet.lines.every((line) => !/[\r\n]/.test(line)), snippet.id).toBe(true)
      expect(snippet.language, snippet.id).toBe(snippet.file.endsWith('.xaml') ? 'xml' : 'csharp')
    }
  })

  it('preserves the current ADS contract and distinguishes commands from UI facts', () => {
    const snippets = new Map(hmiCodeSnippets.map((snippet) => [snippet.id, snippet.lines.join('\n')]))
    expect(snippets.get('ads-contract')).toContain('GVL_ADS.PLT1_AdsStatus')
    expect(snippets.get('ads-contract')).toContain('GVL_ADS.PLT1_AdsInput')
    expect(snippets.get('shell-read')).toContain('snapshot = await plcClient.ReadSnapshotAsync')
    expect(snippets.get('shell-read')).toContain('UiStatusSnapshot = BuildUiStatus(PlcRawSnapshot)')
    expect(snippets.get('ads-coherence')).toContain('value.PlcSequenceBegin == value.PlcSequenceEnd')
    expect(snippets.get('ads-packet')).toContain('Com_AdsInput.CommandSequenceBegin = commandSequence')
    expect(snippets.get('ads-manual')).toContain('Com_AdsInput = previousInput')
    expect(hmiEdges.find((edge) => edge.id === 'ui-window')?.kind).toBe('binding')
    expect(hmiEdges.find((edge) => edge.id === 'client-ads')?.kind).toBe('implementation')
    expect(hmiEdges.find((edge) => edge.id === 'raw-shell')?.kind).toBe('projection')
  })

  it('shows transaction, cancellation and latest-result boundaries in the excerpts', () => {
    const snippets = new Map(hmiCodeSnippets.map((snippet) => [snippet.id, snippet.lines.join('\n')]))
    expect(snippets.get('recipe-transaction')).toContain('connection.BeginTransaction()')
    expect(snippets.get('recipe-transaction')).toContain('transaction.Commit()')
    expect(snippets.get('recipe-transaction')).toContain('command.Parameters.AddWithValue("@Name"')
    expect(snippets.get('history-sql')).toContain('WHERE LotId = @RunId')
    expect(snippets.get('history-sql')).toContain('ExecuteReaderAsync(cancellationToken)')
    expect(snippets.get('history-query')).toContain('ThrowIfNotLatest(linkedCancellation, requestVersion)')
    expect(snippets.get('history-display')).toContain('ThrowIfNotCurrent(request, model)')
    expect(snippets.get('history-display')).toContain('VoltageTrendChart.LoadSnapshot(snapshots.Voltage)')
  })
})
