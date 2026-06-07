import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Boxes, CreditCard, Plus, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { money } from '../lib/format'

function Metric({ icon: Icon, label, value, tone = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md grid place-items-center ${colors[tone]}`}><Icon size={20} /></div>
      <div>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const api = useApi()
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    api.get('/api/dashboard/summary').then(res => setSummary(res.data)).catch(() => {})
  }, [])

  const quick = [
    { to: '/pos', label: 'Open POS', icon: CreditCard },
    { to: '/inventory', label: 'Add Item', icon: Plus },
    { to: '/purchases', label: 'New Purchase', icon: ShoppingBag },
    { to: '/expenses', label: 'Add Expense', icon: ReceiptText },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Pets&Claws Dashboard</h1>
          <p className="text-sm text-slate-500">Today’s sales, stock warnings, expenses, and unpaid supplier purchases.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quick.map(({ to, label, icon: Icon }) => (
            <Link key={to + label} to={to} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800">
              <Icon size={15} /> {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={CreditCard} label="Sales Today" value={money(summary?.sales_today)} />
        <Metric icon={TrendingUp} label="Sales This Month" value={money(summary?.sales_month)} />
        <Metric icon={ReceiptText} label="Expenses This Month" value={money(summary?.expenses_month)} tone="slate" />
        <Metric icon={TrendingUp} label="Gross Margin Estimate" value={money(summary?.gross_margin_month)} />
        <Metric icon={Boxes} label="Total Stock Items" value={summary?.total_items ?? 0} tone="slate" />
        <Metric icon={AlertTriangle} label="Low Stock" value={summary?.low_stock ?? 0} tone="yellow" />
        <Metric icon={AlertTriangle} label="Out of Stock" value={summary?.out_of_stock ?? 0} tone="red" />
        <Metric icon={ShoppingBag} label="Unpaid Purchases" value={money(summary?.unpaid_purchase_total)} tone="yellow" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold">Recent POS Sales</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Sale</th>
              <th className="text-left px-4 py-2">Lines</th>
              <th className="text-left px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.recent_sales || []).map(sale => (
              <tr key={sale.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">#{sale.id}</td>
                <td className="px-4 py-3">{sale.line_count}</td>
                <td className="px-4 py-3">{money(sale.total)}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(sale.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!summary?.recent_sales?.length && (
              <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400">No sales yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
