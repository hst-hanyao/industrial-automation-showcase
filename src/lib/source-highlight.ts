export type SourceTokenKind = 'plain' | 'comment' | 'string' | 'keyword' | 'number' | 'tag' | 'attribute'

export interface SourceToken {
  readonly text: string
  readonly kind: SourceTokenKind
}

const csharpKeywords = new Set('abstract as async await base bool break byte case catch char class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach if implicit in int interface internal is lock long namespace new null object operator out override params partial private protected public readonly record ref return sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while yield Task ValueTask'.split(' '))
const csharpPattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|@"(?:""|[^"])*"|\$?"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_]\w*\b|\b\d+(?:\.\d+)?\b/g
const xmlPattern = /<!--[\s\S]*?-->|"[^"]*"|'[^']*'|<\/?[\w:.-]+|<\?[\w:.-]+|\b[\w:.-]+(?=\s*=)|\?>|\/?>/g

export function highlightSource(text: string, language: 'csharp' | 'xml'): readonly SourceToken[] {
  const pattern = new RegExp(language === 'xml' ? xmlPattern.source : csharpPattern.source, 'g')
  const tokens: SourceToken[] = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const position = match.index
    if (position > cursor) tokens.push({ text: text.slice(cursor, position), kind: 'plain' })
    const value = match[0]
    let kind: SourceTokenKind = 'plain'
    if (value.startsWith('//') || value.startsWith('/*') || value.startsWith('<!--')) kind = 'comment'
    else if (/^[@$]?["']/.test(value)) kind = 'string'
    else if (language === 'xml') kind = value.startsWith('<') || value.endsWith('>') ? 'tag' : 'attribute'
    else if (csharpKeywords.has(value)) kind = 'keyword'
    else if (/^\d/.test(value)) kind = 'number'
    tokens.push({ text: value, kind })
    cursor = position + value.length
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), kind: 'plain' })
  return tokens
}

export function highlightSourceLines(lines: readonly string[], language: 'csharp' | 'xml'): readonly (readonly SourceToken[])[] {
  const output: SourceToken[][] = [[]]
  for (const token of highlightSource(lines.join('\n'), language)) {
    token.text.split('\n').forEach((part, index) => {
      if (index > 0) output.push([])
      if (part) output[output.length - 1]?.push({ text: part, kind: token.kind })
    })
  }
  return output
}
