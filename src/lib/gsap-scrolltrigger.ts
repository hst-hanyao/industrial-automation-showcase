import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from './gsap'

// Importing this module registers ScrollTrigger on the shared gsap singleton.
// Only components that actually use ScrollTrigger should import from here, so
// the 113KB plugin stays out of the initial chunk.
gsap.registerPlugin(ScrollTrigger)

export { ScrollTrigger }
