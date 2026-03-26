import StatusBadge from './StatusBadge'

const LANG_COLORS = {
  Melayu:   'bg-primary-100 text-primary-700',
  Inggeris: 'bg-blue-100 text-blue-700',
  Cina:     'bg-red-100 text-red-700',
  Tamil:    'bg-orange-100 text-orange-700',
}

export default function BookCard({ submission }) {
  const book = submission.books
  const date = submission.submitted_at
    ? new Date(submission.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const langColor = LANG_COLORS[book?.language] || 'bg-gray-100 text-gray-700'

  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-gray-100 last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${langColor}`}>
        {book?.language?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{book?.title || 'Unknown'}</p>
        <p className="text-xs text-gray-400 mt-0.5">{book?.author}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <StatusBadge status={submission.status} />
        <span className="text-xs text-gray-400">{date}</span>
      </div>
    </div>
  )
}
