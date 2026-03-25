import StatusBadge from './StatusBadge'

export default function BookCard({ submission }) {
  const book = submission.books
  const date = submission.submitted_at
    ? new Date(submission.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-primary-500 text-sm font-bold">{book?.language?.[0] || '?'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{book?.title || 'Unknown'}</p>
        <p className="text-xs text-gray-500">{book?.author}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <StatusBadge status={submission.status} />
        <span className="text-xs text-gray-400">{date}</span>
      </div>
    </div>
  )
}
