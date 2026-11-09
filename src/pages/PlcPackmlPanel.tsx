import { useLayoutEffect, useRef } from 'react'
import { mountPackml } from '../plc/packml-runtime'
import packmlMarkup from '../plc/packml.html?raw'
import '../plc/packml.css'

export default function PlcPackmlPanel() {
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = contentRef.current!
    root.innerHTML = packmlMarkup
    const unmount = mountPackml(root)
    return () => {
      unmount()
      root.replaceChildren()
    }
  }, [])

  return <div className="plc-packml" ref={contentRef} />
}
