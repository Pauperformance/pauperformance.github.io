import { useState } from 'react'

// A decklist as MTGO imports it: the maindeck, a blank line, the sideboard.
// decklist: { main: [{ qty, name }], side: [{ qty, name }] }.
export function toMtgoText(decklist) {
  const lines = (decklist.main || []).map(c => `${c.qty} ${c.name}`)
  if (decklist.side && decklist.side.length) {
    lines.push('')
    decklist.side.forEach(c => lines.push(`${c.qty} ${c.name}`))
  }
  return lines.join('\n')
}

const BUTTON = 'px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors'

// The "Download for MTGO" and "Copy for MTGO" buttons. fileName: of the
// downloaded file, e.g. "8022126.txt".
export default function MtgoButtons({ decklist, fileName }) {
  const [copied, setCopied] = useState(false)

  function handleDownload() {
    const blob = new Blob([toMtgoText(decklist)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCopy() {
    navigator.clipboard.writeText(toMtgoText(decklist)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <button onClick={handleDownload} className={BUTTON}>⤓ Download for MTGO</button>
      <button onClick={handleCopy} className={BUTTON}>{copied ? '✓ Copied!' : '⧉ Copy for MTGO'}</button>
    </>
  )
}
