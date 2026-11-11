import {
  Link,
  NavLink,
  type LinkProps,
  type NavLinkProps,
} from 'react-router-dom'
import { preloadRoute } from '../route-modules'

type IntentLinkProps = LinkProps

export function IntentLink({ to, onMouseEnter, onFocus, ...props }: IntentLinkProps) {
  const path = typeof to === 'string' ? to : to.pathname ?? '/'
  const preload = () => {
    void preloadRoute(path)?.catch(() => {})
  }

  return (
    <Link
      to={to}
      onMouseEnter={(event) => {
        preload()
        onMouseEnter?.(event)
      }}
      onFocus={(event) => {
        preload()
        onFocus?.(event)
      }}
      {...props}
    />
  )
}

type IntentNavLinkProps = NavLinkProps

export function IntentNavLink({
  to,
  onMouseEnter,
  onFocus,
  ...props
}: IntentNavLinkProps) {
  const path = typeof to === 'string' ? to : to.pathname ?? '/'
  const preload = () => {
    void preloadRoute(path)?.catch(() => {})
  }

  return (
    <NavLink
      to={to}
      onMouseEnter={(event) => {
        preload()
        onMouseEnter?.(event)
      }}
      onFocus={(event) => {
        preload()
        onFocus?.(event)
      }}
      {...props}
    />
  )
}

