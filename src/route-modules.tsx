import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { CapabilityId } from './data/capabilities'

type PageModule = { default: ComponentType }
type PageLoader = () => Promise<PageModule>
type PageKey = 'home' | 'plcCase' | CapabilityId

export const routeLoaders = {
  home: () => import('./pages/HomePage'),
  hmi: () => import('./pages/HmiPage'),
  plc: () => import('./pages/PlcPage'),
  plcCase: () => import('./pages/PlcCasePage'),
  motion: () => import('./pages/MotionPage'),
  vision: () => import('./pages/VisionPage'),
} satisfies Record<PageKey, PageLoader>

export const lazyPages: Record<
  PageKey,
  LazyExoticComponent<ComponentType>
> = {
  home: lazy(routeLoaders.home),
  hmi: lazy(routeLoaders.hmi),
  plc: lazy(routeLoaders.plc),
  plcCase: lazy(routeLoaders.plcCase),
  motion: lazy(routeLoaders.motion),
  vision: lazy(routeLoaders.vision),
}

export function preloadRoute(path: string): Promise<PageModule> | undefined {
  if (path === '/capabilities') return routeLoaders.home()
  if (path === '/hmi') return routeLoaders.hmi()
  if (path === '/plc') return routeLoaders.plc()
  if (path === '/plc/case') return routeLoaders.plcCase()
  if (path === '/motion') return routeLoaders.motion()
  if (path === '/vision') return routeLoaders.vision()
  return undefined
}

