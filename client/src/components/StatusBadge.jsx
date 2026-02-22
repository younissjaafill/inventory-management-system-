const STATUS_STYLES = {
  in_stock:     'bg-green-100 text-green-700 border-green-200',
  low_stock:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  ordered:      'bg-blue-100 text-blue-700 border-blue-200',
  discontinued: 'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_LABELS = {
  in_stock:     'In Stock',
  low_stock:    'Low Stock',
  ordered:      'Ordered',
  discontinued: 'Discontinued',
}

const STATUS_DOTS = {
  in_stock:     'bg-green-500',
  low_stock:    'bg-yellow-500',
  ordered:      'bg-blue-500',
  discontinued: 'bg-gray-400',
}

export default function StatusBadge({ status, size = 'sm' }) {
  const style   = STATUS_STYLES[status] || STATUS_STYLES.discontinued
  const label   = STATUS_LABELS[status] || status
  const dot     = STATUS_DOTS[status]   || STATUS_DOTS.discontinued
  const padding = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${style} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
