import { useEffect, useRef } from 'react'

const isMac = typeof navigator !== 'undefined' &&
  /mac|iphone|ipad|ipod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform)

export const searchShortcutLabel = isMac ? '⌘F' : 'Ctrl+F'

// Ctrl+F / Cmd+F focuses the returned input instead of opening the browser's
// find, which can't see virtualized (off-screen) rows anyway.
export function useSearchShortcut() {
  const ref = useRef(null)

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((isMac ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        if (ref.current) {
          ref.current.focus()
          ref.current.select()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return ref
}
