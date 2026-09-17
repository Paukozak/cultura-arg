import { useEffect, useState } from 'react'

/** Se re-renderiza cuando cambia si la media query matchea — para layouts
 * que necesitan un valor de JS distinto según el viewport (no solo
 * className condicional), como la dirección en la que desliza un panel. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
