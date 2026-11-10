import { Component, type ReactNode } from 'react'

interface RouteErrorBoundaryProps {
  readonly children: ReactNode
}

interface RouteErrorBoundaryState {
  readonly failed: boolean
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="route-loading" id="main-content" tabIndex={-1}>
          <p role="alert">页面暂时无法加载，请重试。</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
