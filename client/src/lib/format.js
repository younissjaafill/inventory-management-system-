export const money = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const qty = (value, unit = 'piece') => {
  const number = Number(value || 0)
  return `${number.toLocaleString(undefined, { maximumFractionDigits: unit === 'kg' ? 3 : 0 })} ${unit === 'kg' ? 'kg' : 'pcs'}`
}

export const stockClasses = {
  red: 'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-slate-100 text-slate-500 border-slate-200',
}
