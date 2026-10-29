import { useEffect, useRef } from 'react'

const INTERACTIVE = 'a, button, input, select, textarea, [contenteditable="true"]'

// Enter calls onEnter (e.g. to open the first displayed row), unless focus is
// on a link, button or form field, where Enter already means something. The
// page's search input (searchRef) is the exception: typing a query and
// pressing Enter is the point of the shortcut.
export function useEnterShortcut(onEnter, searchRef) {
  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented) return
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      const target = e.target
      const inSearch = searchRef && searchRef.current && target === searchRef.current
      if (!inSearch && target instanceof Element && target.closest(INTERACTIVE)) return
      e.preventDefault()
      onEnterRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchRef])
}
