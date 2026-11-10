// Compatibility entry: the HTML documents load ./showcase-entry directly so the
// bundler can emit static modulepreload links for the first-screen chunks.
// This alias is kept for any stale references that still point at ./main.
import './showcase-entry'
