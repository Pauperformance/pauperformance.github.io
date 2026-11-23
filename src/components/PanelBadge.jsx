// The label of the members of the Pauper Format Panel, the group advising Wizards of the Coast on the format's bans
export default function PanelBadge() {
  return (
    <a
      href="https://magic.wizards.com/en/news/announcements/announcing-pauper-format-panel-2022-01-10"
      target="_blank"
      rel="noopener noreferrer"
      title="Member of the Pauper Format Panel, which advises Wizards of the Coast on the format's bans"
      className="inline-flex items-center gap-1 rounded bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-800/60"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 fill-current" aria-hidden="true">
        <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
      </svg>
      Pauper Format Panel
    </a>
  )
}
