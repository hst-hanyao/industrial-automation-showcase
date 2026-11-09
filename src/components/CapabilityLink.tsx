import type { AnchorHTMLAttributes } from 'react'
import type { Capability } from '../data/capabilities'
import { IntentLink, IntentNavLink } from './IntentLink'

interface CapabilityLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly capability: Capability
  readonly highlightActive?: boolean
}

export function CapabilityLink({ capability, highlightActive, className, ...props }: CapabilityLinkProps) {
  if (highlightActive) {
    return (
      <IntentNavLink
        to={capability.route}
        className={({ isActive }) => isActive ? [className, 'is-active'].filter(Boolean).join(' ') : className}
        {...props}
      />
    )
  }

  return <IntentLink to={capability.route} className={className} {...props} />
}
