import { createElement, isValidElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RouteErrorBoundary } from './RouteErrorBoundary'

function ThrowingChild(): never {
  throw new Error('子组件渲染失败')
}

function renderBoundaryOutput(node: ReactNode): string {
  if (!isValidElement(node)) throw new Error('错误边界未返回可渲染的元素')
  return renderToString(node)
}

describe('RouteErrorBoundary', () => {
  it('未出错时直接渲染子组件', () => {
    const boundary = new RouteErrorBoundary({ children: createElement('div', null, '正常内容') })
    const html = renderBoundaryOutput(boundary.render())

    expect(html).toContain('正常内容')
    expect(html).not.toContain('页面暂时无法加载，请重试。')
  })

  it('子组件抛错时显示中文提示与重新加载按钮', () => {
    // React 的 renderToString 不会触发错误边界（SSR 限制），因此先确认子组件确实抛错，
    // 再按客户端一致的方式应用 getDerivedStateFromError 的结果并渲染兜底 UI。
    expect(() => renderToString(createElement(ThrowingChild))).toThrow()

    const boundary = new RouteErrorBoundary({ children: createElement(ThrowingChild) })
    boundary.state = RouteErrorBoundary.getDerivedStateFromError()
    const html = renderBoundaryOutput(boundary.render())

    expect(html).toContain('页面暂时无法加载，请重试。')
    expect(html).toContain('重新加载')
    expect(html).toContain('role="alert"')
    expect(html).toContain('<button')
  })
})
