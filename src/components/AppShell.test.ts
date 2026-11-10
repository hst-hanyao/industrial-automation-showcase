import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../route-modules', () => ({
  lazyPages: {
    home: () => createElement('div', null, '能力图谱测试页面'),
    plc: () => createElement('div', null, 'PLC架构测试页面'),
    hmi: () => null,
    plcCase: () => null,
    motion: () => null,
    vision: () => null,
    cases: () => null,
  },
  preloadRoute: () => undefined,
}))
vi.mock('./RouteTransition', () => ({ RouteTransition: () => null }))

import { AppShell } from './AppShell'

function renderRoute(path: string, defaultPage?: string) {
  vi.stubGlobal('document', { body: { dataset: { defaultPage } } })
  vi.stubGlobal('window', { location: { search: '' } })
  return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppShell)))
}

afterEach(() => vi.unstubAllGlobals())

describe('homepage layout', () => {
  it('opens on the capability map with full navigation', () => {
    const html = renderRoute('/')
    expect(html).toContain('能力图谱测试页面')
    expect(html).not.toContain('PLC架构测试页面')
    expect(html).toContain('site-header')
    expect(html).toContain('回到本页顶部')
    expect(html).toContain('网站备案信息')
  })

  it('keeps the separate capability map route and navigation', () => {
    const html = renderRoute('/capabilities', 'capabilities')
    expect(html).toContain('能力图谱测试页面')
    expect(html).toContain('site-header')
    expect(html).toContain('回到本页顶部')
  })

  it('keeps full navigation on every capability route', () => {
    const routes = ['/hmi', '/plc', '/plc/case', '/motion', '/vision', '/cases']
    for (const path of routes) {
      const html = renderRoute(path)
      expect(html).toContain('site-header')
      expect(html).toContain('回到本页顶部')
      expect(html).toContain('网站备案信息')
    }
  })

  it('keeps the separate PLC route', () => {
    const html = renderRoute('/plc')
    expect(html).toContain('PLC架构测试页面')
    expect(html).toContain('site-header')
  })
})
