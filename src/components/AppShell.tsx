import { Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { lazyPages } from '../route-modules'
import { NotFound } from './NotFound'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { RouteTransition } from './RouteTransition'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

const {
  home: HomePage,
  hmi: HmiPage,
  plc: PlcPage,
  plcCase: PlcCasePage,
  motion: MotionPage,
  vision: VisionPage,
  cases: CasesPage,
} = lazyPages

function LoadingRoute() {
  return (
    <main className="route-loading" id="main-content" tabIndex={-1}>
      <p role="status">正在加载页面模块…</p>
    </main>
  )
}

export function AppShell() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <SiteHeader />
      <RouteTransition routeKey={location.pathname} />
      <RouteErrorBoundary key={location.pathname}>
        <Suspense fallback={<LoadingRoute />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/capabilities" element={<HomePage />} />
            <Route path="/hmi" element={<HmiPage />} />
            <Route path="/plc" element={<PlcPage />} />
            <Route path="/plc/case" element={<PlcCasePage />} />
            <Route path="/motion" element={<MotionPage />} />
            <Route path="/vision" element={<VisionPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
      <SiteFooter />
    </div>
  )
}
