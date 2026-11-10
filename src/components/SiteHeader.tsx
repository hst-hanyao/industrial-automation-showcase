import { useEffect, useId, useRef, useState } from 'react'
import { capabilities } from '../data/capabilities'
import { CapabilityLink } from './CapabilityLink'
import { DeviceDemoMenu } from './DeviceDemoMenu'
import { ExecutiveQuickTour } from './ExecutiveQuickTour'
import { IntentLink, IntentNavLink } from './IntentLink'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false)
    const desktop = window.matchMedia('(min-width: 768px)')
    window.addEventListener('hashchange', closeMenu)
    if (typeof desktop.addEventListener === 'function') {
      desktop.addEventListener('change', closeMenu)
    } else {
      desktop.addListener(closeMenu)
    }
    return () => {
      window.removeEventListener('hashchange', closeMenu)
      if (typeof desktop.removeEventListener === 'function') {
        desktop.removeEventListener('change', closeMenu)
      } else {
        desktop.removeListener(closeMenu)
      }
    }
  }, [])

  return (
    <>
      <header
        className={`site-header${menuOpen ? ' is-menu-open' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) {
            event.preventDefault()
            setMenuOpen(false)
            toggleRef.current?.focus()
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
        }}
      >
        <IntentLink to="/capabilities" className="brand-lockup" title="返回能力图谱">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <b>能力图谱</b>
          </span>
        </IntentLink>

        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? '关闭能力导航' : '展开能力导航'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
          <span>{menuOpen ? '关闭' : '导航'}</span>
        </button>

        <nav id={menuId} className="primary-nav" aria-label="能力详情">
          {capabilities.map((capability) => (
            <CapabilityLink
              key={capability.id}
              capability={capability}
              className="nav-domain"
              highlightActive
              style={{ '--nav-accent': capability.accent } as React.CSSProperties}
              onClick={() => setMenuOpen(false)}
            >
              <b>{capability.shortName}</b>
            </CapabilityLink>
          ))}
          <IntentNavLink
            to="/cases"
            className={({ isActive }) => `nav-domain nav-domain--cases${isActive ? ' is-active' : ''}`}
            style={{
              '--nav-accent': '#16a34a',
            } as React.CSSProperties}
            onClick={() => setMenuOpen(false)}
          >
            <b>问题排查</b>
          </IntentNavLink>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="tour-trigger-pill"
            onClick={() => setTourOpen(true)}
            title="打开 3 分钟精选导览"
            aria-haspopup="dialog"
            aria-expanded={tourOpen}
          >
            <span>★</span> 3分钟速览
          </button>
          <DeviceDemoMenu onOpen={() => setMenuOpen(false)} />
        </div>
      </header>

      <ExecutiveQuickTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </>
  )
}
