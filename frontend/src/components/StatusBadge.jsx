export default function StatusBadge({ status }) {
  const cfg = {
    success: { cls: 'bg-ok-100 text-ok-600',       dot: 'bg-ok-500',     label: 'Success' },
    failed:  { cls: 'bg-danger-100 text-danger-600', dot: 'bg-danger-500', label: 'Failed'  },
    pending: { cls: 'bg-warn-100 text-warn-600',     dot: 'bg-warn-500',   label: 'Pending' },
  }
  const c = cfg[status] || { cls: 'bg-gray-100 text-muted', dot: 'bg-subtle', label: status }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  )
}
