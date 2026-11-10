import { type AnchorHTMLAttributes, type MouseEvent } from 'react'
import type { Capability } from '../data/capabilities'
import { useSharedTransition } from '../features/motion/useSharedTransition'
import { IntentLink, IntentNavLink } from './IntentLink'

interface CapabilityLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly capability: Capability
  readonly highlightActive?: boolean
}

export function CapabilityLink({ capability, highlightActive, className, onClick, ...props }: CapabilityLinkProps) {
  const startTransition = useSharedTransition()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    startTransition(capability.route, event.currentTarget)
  }

  if (highlightActive) {
    return (
      <IntentNavLink
        to={capability.route}
        className={({ isActive }) => isActive ? [className, 'is-active'].filter(Boolean).join(' ') : className}
        onClick={handleClick}
        {...props}
      />
    )
  }

  return <IntentLink to={capability.route} className={className} onClick={handleClick} {...props} />
}
