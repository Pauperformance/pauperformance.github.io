import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import raw from '../../pages/phd_guidelines.md?raw'

const INTERNAL_LINKS = {
  './archetypes_index.md': '/archetypes',
  './set_index.md': '/sets',
}

function transformImageUri(src) {
  return src.replace('../resources/images/', '/images/')
}

const components = {
  img({ src, alt }) {
    return (
      <img
        src={transformImageUri(src)}
        alt={alt}
        className="my-4 rounded-xl border border-gray-700 max-w-full"
      />
    )
  },
  a({ href, children }) {
    const internal = INTERNAL_LINKS[href]
    if (internal) {
      return <Link to={internal} className="text-amber-400 hover:underline">{children}</Link>
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
        {children}
      </a>
    )
  },
  h1({ children }) {
    return <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
  },
  h3({ children }) {
    return <h3 className="text-lg font-semibold text-amber-400 mt-8 mb-3">{children}</h3>
  },
  p({ children }) {
    return <p className="text-gray-300 leading-relaxed mb-3">{children}</p>
  },
  strong({ children }) {
    return <strong className="text-white font-semibold">{children}</strong>
  },
  ul({ children }) {
    return <ul className="list-disc list-inside space-y-1 mb-3 text-gray-300">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-300">{children}</ol>
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>
  },
  code({ inline, children }) {
    if (inline) {
      return (
        <code className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs font-mono text-amber-300">
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 my-3 overflow-x-auto">
        <code className="text-sm font-mono text-amber-300">{children}</code>
      </pre>
    )
  },
  hr() {
    return <hr className="border-gray-700 my-6" />
  },
}

export default function PhDGuidelines() {
  return (
    <Layout>
      <div className="prose-container max-w-2xl">
        <ReactMarkdown components={components}>{raw}</ReactMarkdown>
      </div>
    </Layout>
  )
}
