import { describe, expect, it } from 'vitest'
import { hmiCodeSnippets } from '../data/hmi-architecture'
import { highlightSource, highlightSourceLines } from './source-highlight'

describe('local source highlighting', () => {
  it('preserves every original source excerpt including whitespace and empty lines', () => {
    for (const snippet of hmiCodeSnippets) {
      expect(highlightSource(snippet.lines.join('\n'), snippet.language).map((token) => token.text).join(''), snippet.id).toBe(snippet.lines.join('\n'))
      expect(highlightSourceLines(snippet.lines, snippet.language).map((line) => line.map((token) => token.text).join('')), snippet.id).toEqual(snippet.lines)
    }
  })

  it('keeps multiline comments and quoted keywords out of the keyword branch', () => {
    const tokens = highlightSource('/* public\nreturn */\nvar text = "return 42"; // async', 'csharp')
    expect(tokens.filter((token) => token.kind === 'keyword').map((token) => token.text)).toEqual(['var'])
    expect(tokens.find((token) => token.text === '/* public\nreturn */')?.kind).toBe('comment')
    expect(tokens.find((token) => token.text === '"return 42"')?.kind).toBe('string')
  })

  it('distinguishes XML tag names, attributes and quoted binding expressions', () => {
    const text = '<TextBlock Text="{Binding Status}" />\n<!-- <fake /> -->'
    const tokens = highlightSource(text, 'xml')
    expect(tokens.find((token) => token.text === '<TextBlock')?.kind).toBe('tag')
    expect(tokens.find((token) => token.text === 'Text')?.kind).toBe('attribute')
    expect(tokens.find((token) => token.text === '"{Binding Status}"')?.kind).toBe('string')
    expect(tokens.find((token) => token.text === '<!-- <fake /> -->')?.kind).toBe('comment')
  })
})
