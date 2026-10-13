import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import type { HmiCodeSnippet, HmiNode } from '../data/hmi-architecture'
import { SourceCode } from './SourceCode'
import '../styles/hmi-source.css'

interface HmiSourceReaderProps {
  readonly id: string
  readonly node: HmiNode
  readonly snippet: HmiCodeSnippet
  readonly snippets: readonly HmiCodeSnippet[]
  readonly contextLabel: string
  readonly readerRef: RefObject<HTMLElement | null>
  readonly titleRef: RefObject<HTMLHeadingElement | null>
  readonly onSnippet: (snippetId: string) => void
  readonly onClose: () => void
}

export function HmiSourceReader({ id, node, snippet, snippets, contextLabel, readerRef, titleRef, onSnippet, onClose }: HmiSourceReaderProps) {
  const [wrap, setWrap] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle')
  const scrollRef = useRef<HTMLDivElement>(null)
  const feedbackTimer = useRef<number | undefined>(undefined)
  const methodId = useId()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [snippet.id])

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), [])

  const copy = async () => {
    window.clearTimeout(feedbackTimer.current)
    setCopyStatus('copying')
    try {
      await navigator.clipboard.writeText(snippet.lines.join('\n'))
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
    feedbackTimer.current = window.setTimeout(() => setCopyStatus('idle'), 3500)
  }

  return (
    <aside ref={readerRef} className="hmi-code-reader" id={id} aria-label={`${node.label} 的源码`}>
      <header className="hmi-code-reader__header">
        <div>
          <p className="hmi-code-reader__context">{contextLabel}</p>
          <h3 ref={titleRef} tabIndex={-1}>{node.roleTitle} <span translate="no">/ {node.label}</span></h3>
        </div>
        <button type="button" className="hmi-reader-button" onClick={onClose} aria-label="关闭代码，返回进入阅读前的架构">返回架构 <span aria-hidden="true">×</span></button>
      </header>
      <div className="hmi-method-selector">
        <label htmlFor={methodId}>方法 / {snippet.language === 'xml' ? 'XAML' : 'C#'}</label>
        <select id={methodId} value={snippet.id} onChange={(event) => {
          setCopyStatus('idle')
          onSnippet(event.currentTarget.value)
        }} translate="no">
          {snippets.map((item) => <option key={item.id} value={item.id}>{item.symbol}</option>)}
        </select>
      </div>
      <div className="hmi-reader-location"><span translate="no">{snippet.file}</span><span>L{snippet.startLine}–{snippet.startLine + snippet.lines.length - 1}</span></div>
      <div className="hmi-reader-tools">
        <button type="button" className="hmi-reader-button" onClick={() => { void copy() }} disabled={copyStatus === 'copying'}>复制代码</button>
        <button type="button" className="hmi-reader-button" aria-pressed={wrap} onClick={() => setWrap(!wrap)}>自动换行 {wrap ? '开' : '关'}</button>
        <span className="hmi-copy-feedback" role="status" aria-live="polite">{copyStatus === 'copied' ? '已复制原始代码' : copyStatus === 'failed' ? '复制失败，请选择代码后手动复制' : copyStatus === 'copying' ? '正在复制…' : ''}</span>
      </div>
      <div className="hmi-code-reader__scroll" ref={scrollRef} tabIndex={0} role="region" aria-label={`${snippet.symbol} 源码，可滚动查看`}>
        <SourceCode snippet={snippet} wrap={wrap} />
      </div>
      <p className="hmi-code-reader__note">真实源码片段 · 原始行号 · 方法调用与返回关系见架构</p>
    </aside>
  )
}
