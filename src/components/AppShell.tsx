import { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation, useMatch } from 'react-router-dom'
import { lazyPages } from '../route-modules'
import { RouteTransition } from './RouteTransition'
import { ScrollTargetButton } from './ScrollTargetButton'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

const { home: HomePage, hmi: HmiPage, plc: PlcPage, plcCase: PlcCasePage, motion: MotionPage, vision: VisionPage } = lazyPages

function LoadingRoute() {
  return (
    <main className="route-loading" id="main-content">
      <p role="status">正在加载页面模块…</p>
    </main>
  )
}

export function AppShell() {
  const location = useLocation()
  const plcSection = useMatch('/plc/*')
  const isCapabilityMapEntry = document.body.dataset.defaultPage === 'capabilities'
  const enteringPlc = location.pathname === '/' && !isCapabilityMapEntry
  const previousView = new URLSearchParams(window.location.search).get('view')
  const initialPlcSearch = previousView ? new URLSearchParams({ view: previousView }).toString() : ''

  return (
    <div className="app-shell">
      <ScrollTargetButton className="skip-link" targetId="main-content">
        跳到主要内容
      </ScrollTargetButton>
      <SiteHeader showNavigation={!plcSection && !enteringPlc} />
      <RouteTransition routeKey={location.pathname} />
      <Suspense fallback={<LoadingRoute />}>
        <Routes location={location}>
          <Route path="/" element={isCapabilityMapEntry
            ? <HomePage />
            : <Navigate to={{ pathname: '/plc', search: initialPlcSearch }} replace />} />
          <Route path="/capabilities" element={<HomePage />} />
          <Route path="/hmi" element={<HmiPage />} />
          <Route path="/plc" element={<PlcPage />} />
          <Route path="/plc/case" element={<PlcCasePage />} />
          <Route path="/motion" element={<MotionPage />} />
          <Route path="/vision" element={<VisionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <SiteFooter />
    </div>
  )
}
