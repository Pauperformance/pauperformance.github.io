import { useState, useEffect } from 'react'

// Whether the screen matches a CSS media query, kept up to date as it resizes.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const onChange = () => setMatches(m.matches)
    setMatches(m.matches)
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [query])
  return matches
}
