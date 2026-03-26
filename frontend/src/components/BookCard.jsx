import StatusBadge from './StatusBadge'

const LANG_COLORS = {
  Melayu:   'bg-brand-50 text-brand-600',
  Inggeris: 'bg-ok-50 text-ok-600',
  Cina:     'bg-danger-50 text-danger-600',
  Tamil:    'bg-warn-50 text-warn-600',
}

export default function BookCard({ submission }) {
  const book = submission.books
  const date = submission.submitted_at
    ? new Date(submission.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
  const langCls = LANG_COLORS[book?.language] || 'bg-gray-100 text-muted'

  return (
    <div className="flex items-start gap-3.5 py-3.5 border-b border-line last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold ${langCls}`}>
        {book?.language?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-heading truncate">{book?.title || 'Unknown'}</p>
        <p className="text-xs text-muted mt-0.5">{book?.author}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <StatusBadge status={submission.status} />
        <span className="font-mono text-xs text-subtle">{date}</span>
      </div>
    </div>
  )
}
