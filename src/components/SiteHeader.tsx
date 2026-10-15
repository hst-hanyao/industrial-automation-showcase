import { useEffect, useId, useRef, useState } from 'react'
import { capabilities } from '../data/capabilities'
import { IntentNavLink } from './IntentLink'

export function SiteHeader() {
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
    <header className={`site-header${menuOpen ? ' is-menu-open' : ''}`}
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
      <IntentNavLink className="brand-lockup" to="/" aria-label="返回能力图谱主页" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <b>CONTROL / EVIDENCE</b>
          <small>工业自动化能力图谱</small>
        </span>
      </IntentNavLink>

      <button ref={toggleRef} type="button" className="nav-toggle" aria-expanded={menuOpen}
        aria-controls={menuId} aria-label={menuOpen ? '关闭能力导航' : '展开能力导航'}
        onClick={() => setMenuOpen((open) => !open)}>
        <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        <span>{menuOpen ? '关闭' : '导航'}</span>
      </button>

      <nav id={menuId} className="primary-nav" aria-label="能力详情">
        {capabilities.map((capability) => (
          <IntentNavLink
            key={capability.id}
            to={capability.route}
            className={({ isActive }) =>
              `nav-domain${isActive ? ' is-active' : ''}`
            }
            style={{ '--nav-accent': capability.accent } as React.CSSProperties}
            onClick={() => setMenuOpen(false)}
          >
            <span>{capability.order}</span>
            <b>{capability.shortName}</b>
          </IntentNavLink>
        ))}
      </nav>

      <a className="header-teaching-link" href={`${import.meta.env.BASE_URL}waferplt/`}
        aria-label="进入晶圆电镀工艺3D教学演示">
        <span className="header-teaching-link__full">进入晶圆电镀工艺3D教学演示</span>
        <span className="header-teaching-link__compact">3D 演示</span>
        <span aria-hidden="true">↗</span>
      </a>

    </header>
  )
}
