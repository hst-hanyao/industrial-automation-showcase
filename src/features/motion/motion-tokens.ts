/**
 * Single source of truth for JS-driven (GSAP) motion timings, in milliseconds.
 * The matching --motion-* custom properties in styles/base.css serve CSS
 * transitions. Keep both lists aligned when tuning.
 */
export const MOTION = {
  intro: 520,
  introStagger: 55,
  introShift: 24,
  focusDelay: 860,
  enter: 240,
  press: 100,
  exit: 150,
  reveal: 450,
} as const
