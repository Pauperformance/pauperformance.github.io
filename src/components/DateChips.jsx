// The date filter: one chip per range, the one picked highlighted; picking it again clears it.
// ranges: the chips' labels (utils/dateRanges.js); value: the label picked, '' for none.
export default function DateChips({ ranges, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ranges.map(label => (
        <button key={label} onClick={() => onChange(value === label ? '' : label)} aria-pressed={value === label}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${value === label
            ? 'border-amber-400 text-amber-400 bg-amber-400/10'
            : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}
