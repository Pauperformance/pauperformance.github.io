import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const FAQS = [
  {
    q: 'What is Pauperformance?',
    a: <>
      Pauperformance is a shared journey to optimal <a href="https://magic.wizards.com/formats/pauper" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Pauper</a>, a <a href="https://magic.wizards.com/" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Magic: The Gathering format</a>.
      {' '}The project consists of distinct yet linked parts: the <strong className="text-white">Academy</strong>, the <strong className="text-white">Arena</strong>, the <strong className="text-white">Spellbook</strong>, the <strong className="text-white">Nexus</strong>, and <strong className="text-white">Myr</strong>.
    </>,
  },
  {
    q: 'What is the Academy?',
    a: <>
      The Academy is this website. It aims to be the online encyclopedia for Pauper, collecting and organising resources for players with different skill levels.
      {' '}It contains a growing collection of pages providing information about current and old archetypes, sideboard guides, gameplay videos, meta analysis, and more.
      {' '}Large sections are automatically generated and kept up-to-date by <strong className="text-white">Myr</strong>, the Pauperformance bot, so the Academy easily follows new Magic releases and weekly tournaments.
      {' '}The name is inspired by the card <a href="https://scryfall.com/card/usg/330/tolarian-academy" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Tolarian Academy</a>.
    </>,
  },
  {
    q: 'What is the Arena?',
    a: <>
      The Arena is where we host our shows. Live videos are streamed on <a href="https://www.twitch.tv/pauperformance" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Twitch</a>; replays are archived on <a href="https://www.youtube.com/channel/UCDUiIskNnmuJ3XJ1SdQqs0A" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">YouTube</a>.
      {' '}We play in a cooperative way — discussing strategies and sharing ideas — to systematically explore the format and offer wide meta coverage.
      {' '}The name is inspired by the card <a href="https://scryfall.com/card/hop/36/phyrexian-arena" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Phyrexian Arena</a>.
    </>,
  },
  {
    q: 'What is the Spellbook?',
    a: <>
      The Spellbook is the artistic spin-off of the project, dedicated to in-depth card analyses, trivia, and Magic lore.
      {' '}Pauper artworks and pills are shared on <a href="https://www.instagram.com/pauperformance/" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Instagram</a>.
      {' '}The name is inspired by the card <a href="https://scryfall.com/card/m10/220/spellbook" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Spellbook</a>.
    </>,
  },
  {
    q: 'What is the Nexus?',
    a: <>
      The Nexus is our Discord server — an inclusive place to chat about decks and strategy, and a well-organized content aggregator.
      {' '}Join the community <a href="https://discord.gg/fYQbpjjkQ3" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">here on Discord</a>.
      {' '}The name is inspired by the card <a href="https://scryfall.com/card/arb/130/maelstrom-nexus" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Maelstrom Nexus</a>.
    </>,
  },
  {
    q: 'Who is Myr?',
    a: <>
      Myr is the Pauperformance bot. It works under the hood to update the Academy and keep everything in sync with new Magic releases and tournament results.
      {' '}It is hosted on <a href="https://github.com/Pauperformance/pauperformance-bot" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>.
      {' '}The name is inspired by the card <a href="https://scryfall.com/card/mrd/215/myr-retriever" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Myr Retriever</a>.
    </>,
  },
  {
    q: 'How can I support Pauperformance?',
    a: <>
      <p className="mb-2">The simplest way is to follow and subscribe on <a href="https://www.twitch.tv/pauperformance" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Twitch</a> and <a href="https://www.youtube.com/channel/UCDUiIskNnmuJ3XJ1SdQqs0A" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">YouTube</a>, and share the project with other players.</p>
      <p className="mb-2">If you are a <strong className="text-white">Pauper player</strong> and want to help with the development of the Academy, join us on <a href="https://discord.gg/fYQbpjjkQ3" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">Discord</a>.</p>
      <p className="mb-2">If you are a <strong className="text-white">content creator</strong> (streamer, blogger, etc.), we would be happy to link your content in the Academy. Creators that contribute to the Academy are referred to as <strong className="text-white">PhD (Pauper honorable Dignitary)</strong>. Read the <Link to="/phd" className="text-amber-400 hover:text-amber-300">PhD Guidelines</Link> to learn more.</p>
      <p>Huge thanks for your support!</p>
    </>,
  },
  {
    q: 'Why are you naming decks this way?',
    a: <>
      <p className="mb-2">Every deck in Pauperformance is uniquely identified by: <code className="bg-gray-700 px-1.5 py-0.5 rounded text-amber-300 text-xs">Archetype_name magic_set_id.revision_id.player_id</code>.</p>
      <p className="mb-2">For example, if player <em>MrEvilEye</em> creates a new Affinity deck after the release of Modern Horizons 2 (set code 676), it becomes <code className="bg-gray-700 px-1.5 py-0.5 rounded text-amber-300 text-xs">Affinity 676.001.MrEvilEye</code>. A subsequent revision would be <code className="bg-gray-700 px-1.5 py-0.5 rounded text-amber-300 text-xs">Affinity 676.002.MrEvilEye</code>.</p>
      <p>This naming scheme allows Myr to automatically index Pauper content across the internet and link online resources to the correct archetypes, enabling analyses that cannot be found on other Magic websites.</p>
    </>,
  },
  {
    q: 'What are the next steps?',
    a: <>
      We have a long roadmap ahead and are specifically looking for content creators — streamers, article writers, expert players — so the Academy can bring more visibility to their work.
      {' '}Follow us on social media for regular updates. The journey is long and exciting!
    </>,
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-800 hover:bg-gray-750 transition-colors text-left gap-4">
        <span className="font-semibold text-white">{q}</span>
        <span className="text-gray-500 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 py-4 bg-gray-900 border-t border-gray-700 text-sm text-gray-300 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">FAQ</h1>
          <p className="mt-2 text-gray-400 text-sm">Answers to recurring questions about the Pauperformance project.</p>
        </div>
        <div className="space-y-2">
          {FAQS.map(({ q, a }) => (
            <FAQItem key={q} q={q} a={a} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
