import { useEffect, useId, useRef, useState } from 'react'

interface DeviceDemoMenuProps {
  onOpen?: () => void
}

export function DeviceDemoMenu({ onOpen }: DeviceDemoMenuProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  const openWithFocus = (last = false) => {
    setOpen(true)
    onOpen?.()
    window.requestAnimationFrame(() => {
      const links = panelRef.current?.querySelectorAll<HTMLAnchorElement>('a')
      if (links?.length) links[last ? links.length - 1 : 0]?.focus()
    })
  }

  return (
    <div ref={containerRef} className="device-demo-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          setOpen(false)
          triggerRef.current?.focus()
          return
        }
        if (event.target === triggerRef.current || !open) return
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        const links = Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])
        if (!links.length) return
        event.preventDefault()
        const index = links.indexOf(document.activeElement as HTMLAnchorElement)
        const next = event.key === 'Home' ? 0
          : event.key === 'End' ? links.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length
        links[next]?.focus()
      }}
    >
      <button ref={triggerRef} type="button" className="device-demo-menu__trigger"
        aria-expanded={open} aria-controls={panelId}
        aria-label="选择三维设备演示"
        onClick={() => {
          if (!open) onOpen?.()
          setOpen((wasOpen) => !wasOpen)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openWithFocus(event.key === 'ArrowUp')
          }
        }}
      >
        <span>3D 演示</span>
        <span className="device-demo-menu__chevron" aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <nav ref={panelRef} id={panelId} className="device-demo-menu__panel" aria-label="三维设备演示">
          <p className="device-demo-menu__heading">选择设备</p>
          <a href={`${import.meta.env.BASE_URL}waferplt/`} onClick={() => setOpen(false)}>
            <span className="device-demo-menu__number" aria-hidden="true">01</span>
            <span><b>晶圆电镀工艺</b><small>工艺流程与设备模块</small></span>
            <span className="device-demo-menu__arrow" aria-hidden="true">↗</span>
          </a>
          <a href={`${import.meta.env.BASE_URL}stretch-bender/`} onClick={() => setOpen(false)}>
            <span className="device-demo-menu__number" aria-hidden="true">02</span>
            <span><b>三维拉弯机</b><small>左右 16 轴独立调节</small></span>
            <span className="device-demo-menu__arrow" aria-hidden="true">↗</span>
          </a>
        </nav>
      ) : null}
    </div>
  )
}
