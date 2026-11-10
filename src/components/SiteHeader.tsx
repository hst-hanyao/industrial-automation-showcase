import { useEffect, useId, useRef, useState } from 'react'
import { capabilities } from '../data/capabilities'
import { CapabilityLink } from './CapabilityLink'
import { DeviceDemoMenu } from './DeviceDemoMenu'

export function SiteHeader({ showNavigation }: { showNavigation: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false)
    const desktop = window.matchMedia('(min-width: 768px)')
    window.addEventListener('hashchange', closeMenu)
    desktop.addEventListener('change', closeMenu)
    return () => {
      window.removeEventListener('hashchange', closeMenu)
      desktop.removeEventListener('change', closeMenu)
    }
  }, [])

  return (
    <header className={`site-header${showNavigation ? (menuOpen ? ' is-menu-open' : '') : ' site-header--title-only'}`}
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
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <b>CONTROL / EVIDENCE</b>
          <small>PLC 程序架构</small>
        </span>
      </div>

      {showNavigation && (
        <>
          <button ref={toggleRef} type="button" className="nav-toggle" aria-expanded={menuOpen}
            aria-controls={menuId} aria-label={menuOpen ? '关闭能力导航' : '展开能力导航'}
            onClick={() => setMenuOpen((open) => !open)}>
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
                <span>{capability.order}</span>
                <b>{capability.shortName}</b>
              </CapabilityLink>
            ))}
          </nav>

          <DeviceDemoMenu onOpen={() => setMenuOpen(false)} />
        </>
      )}

    </header>
  )
}
