import { useMediaQuery } from '@vueuse/core'

/**
 * useBreakpoint — reactive layout breakpoints.
 *
 * `isNarrow` (< 900px) is the design's primary breakpoint: it collapses the
 * marketing nav to a hamburger and swaps the app sidebar for the mobile tab bar.
 */
export function useBreakpoint() {
  const isNarrow = useMediaQuery('(max-width: 899px)')
  const isMobile = useMediaQuery('(max-width: 640px)')

  return { isNarrow, isMobile }
}
