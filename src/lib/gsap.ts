import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'

// Only the core plugin is registered here so the first-screen bundle stays free
// of ScrollTrigger (see ./gsap-scrolltrigger.ts for the on-demand registration).
gsap.registerPlugin(useGSAP)

gsap.defaults({
  duration: 0.72,
  ease: 'power3.out',
})

export { gsap, useGSAP }
