import { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazyPages } from '../route-modules'
import { RouteTransition } from './RouteTransition'
import { ScrollTargetButton } from './ScrollTargetButton'
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
    <main className="route-loading" id="main-content">
      <p role="status">正在加载页面模块…</p>
    </main>
  )
}

export function AppShell() {
  const location = useLocation()
  const previousView = document.body.dataset.defaultPage === 'capabilities'
    ? null
    : new URLSearchParams(window.location.search).get('view')

  return (
    <div className="app-shell">
      <ScrollTargetButton className="skip-link" targetId="main-content">
        跳到主要内容
      </ScrollTargetButton>
      <SiteHeader />
      <RouteTransition routeKey={location.pathname} />
      <Suspense fallback={<LoadingRoute />}>
        <Routes location={location}>
          <Route path="/" element={previousView
            ? <Navigate to={{ pathname: '/plc', search: new URLSearchParams({ view: previousView }).toString() }} replace />
            : <HomePage />} />
          <Route path="/capabilities" element={<HomePage />} />
          <Route path="/hmi" element={<HmiPage />} />
          <Route path="/plc" element={<PlcPage />} />
          <Route path="/plc/case" element={<PlcCasePage />} />
          <Route path="/motion" element={<MotionPage />} />
          <Route path="/vision" element={<VisionPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <SiteFooter />
    </div>
  )
}
