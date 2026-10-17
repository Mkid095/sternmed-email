import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query.
 *
 * Used where a component needs a genuinely different layout, not a smaller one.
 * Tailwind's responsive prefixes can only toggle visibility, so swapping a
 * seven-column desktop grid for a stacked mobile row needs real branching —
 * and two nearly-identical DOM trees in one component is worse than one
 * conditional.
 *
 * Matches Tailwind's breakpoints so the two stay in step: sm = 640px.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    // Re-read on subscribe: the query may have changed between render and effect.
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True at Tailwind's `sm` breakpoint and above. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 640px)')
}