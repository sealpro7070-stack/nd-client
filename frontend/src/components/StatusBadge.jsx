export default function StatusBadge({ status }) {
  const styles = {
    success: 'bg-green-100 text-green-700 border border-green-200',
    failed:  'bg-red-100 text-red-700 border border-red-200',
    pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  }
  const dots = {
    success: 'bg-green-500',
    failed:  'bg-red-500',
    pending: 'bg-yellow-500 animate-pulse',
  }
  const labels = {
    success: 'Success',
    failed:  'Failed',
    pending: 'Pending',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dots[status] || 'bg-gray-400'}`} />
      {labels[status] || status}
    </span>
  )
}
