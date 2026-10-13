import { Fragment } from 'react'
import type { HmiCodeSnippet } from '../data/hmi-architecture'
import { highlightSourceLines } from '../lib/source-highlight'

interface SourceCodeProps {
  readonly snippet: HmiCodeSnippet
  readonly wrap?: boolean
  readonly preview?: boolean
}

export function SourceCode({ snippet, wrap = false, preview = false }: SourceCodeProps) {
  const lines = highlightSourceLines(snippet.lines, snippet.language)
  return (
    <pre className={`hmi-source${wrap ? ' is-wrapped' : ''}${preview ? ' hmi-source--preview' : ''}`}>
      <code translate="no">
        {lines.map((tokens, index) => (
          <Fragment key={index}>
            <span className="hmi-source__line">
              <span className="hmi-source__number" aria-hidden="true">{snippet.startLine + index}</span>
              <span className="hmi-source__text">{tokens.map((token, tokenIndex) => <span key={tokenIndex} className={`hmi-token hmi-token--${token.kind}`}>{token.text}</span>)}</span>
            </span>
            {index < lines.length - 1 ? '\n' : null}
          </Fragment>
        ))}
      </code>
    </pre>
  )
}
