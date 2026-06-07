import { useEffect, useMemo, useRef, useState } from 'react'
import { Barcode, CalendarDays, Minus, Plus, ScanLine, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import { dateOnly, localDateInputValue, money, qty } from '../lib/format'

export default function POSPage() {
  const api = useApi()
  const inputRef = useRef(null)
  const [barcode, setBarcode] = useState('')
  const [cart, setCart] = useState([])
  const [cartDiscount, setCartDiscount] = useState(0)
  const [checkingOut, setCheckingOut] = useState(false)
  const [historyDate, setHistoryDate] = useState(localDateInputValue())
  const [salesHistory, setSalesHistory] = useState([])

  const fetchSalesHistory = async () => {
    const res = await api.get(`/api/pos/sales?date=${historyDate}`)
    setSalesHistory(res.data)
  }

  useEffect(() => {
    fetchSalesHistory().catch(() => toast.error('Failed to load sales history'))
  }, [historyDate])

  const addByBarcode = async (e) => {
    e.preventDefault()
    if (!barcode.trim()) return
    try {
      const res = await api.get(`/api/items/barcode/${encodeURIComponent(barcode.trim())}`)
      const item = res.data
      setCart(prev => {
        const existing = prev.find(line => line.item_id === item.id)
        if (existing) return prev.map(line => line.item_id === item.id ? { ...line, quantity: Number(line.quantity) + 1 } : line)
        return [...prev, { item_id: item.id, name: item.name, barcode: item.barcode, unit_type: item.unit_type, available: Number(item.quantity), unit_price: Number(item.sale_price), quantity: item.unit_type === 'kg' ? 0.25 : 1, discount: 0 }]
      })
      setBarcode('')
      inputRef.current?.focus()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Barcode not found')
    }
  }

  const update = (itemId, patch) => setCart(prev => prev.map(line => line.item_id === itemId ? { ...line, ...patch } : line))
  const remove = (itemId) => setCart(prev => prev.filter(line => line.item_id !== itemId))

  const lineBase = (line) => Math.max(0, Number(line.unit_price || 0) * Number(line.quantity || 0))
  const percent = (value) => Math.min(100, Math.max(0, Number(value || 0)))
  const lineDiscountAmount = (line) => lineBase(line) * (percent(line.discount_percent ?? line.discount) / 100)
  const lineTotal = (line) => Math.max(0, lineBase(line) - lineDiscountAmount(line))
  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + lineTotal(line), 0), [cart])
  const cartDiscountAmount = subtotal * (percent(cartDiscount) / 100)
  const total = Math.max(0, subtotal - cartDiscountAmount)

  const checkout = async () => {
    if (!cart.length) return toast.error('Cart is empty')
    const over = cart.find(line => Number(line.quantity) > Number(line.available))
    if (over) return toast.error(`Insufficient stock for ${over.name}`)
    setCheckingOut(true)
    try {
      await api.post('/api/pos/sales', {
        cart_discount_percent: Number(cartDiscount || 0),
        lines: cart.map(({ item_id, quantity, unit_price, discount_percent, discount }) => ({
          item_id,
          quantity: Number(quantity),
          unit_price: Number(unit_price || 0),
          discount_percent: Number(discount_percent ?? discount ?? 0),
        })),
      })
      toast.success('Sale completed and stock deducted')
      setCart([])
      setCartDiscount(0)
      fetchSalesHistory().catch(() => {})
      inputRef.current?.focus()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed')
    } finally {
      setCheckingOut(false)
    }
  }

  const historyTotal = salesHistory.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
  const historyItems = salesHistory.reduce((sum, sale) => sum + (sale.lines || []).reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">POS</h1>
        <p className="text-sm text-slate-500">Scan or type a barcode, adjust quantities and discounts, then checkout.</p>
      </div>

      <form onSubmit={addByBarcode} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-2">
        <div className="relative flex-1">
          <Barcode size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            placeholder="Scan barcode"
            className="w-full rounded-md border border-slate-300 pl-10 pr-3 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
        </div>
        <button className="px-4 rounded-md bg-emerald-700 text-white font-semibold hover:bg-emerald-800 inline-flex items-center gap-2">
          <ScanLine size={18} /> Add
        </button>
      </form>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Available</th>
                <th className="text-left px-4 py-3">Quantity</th>
                <th className="text-left px-4 py-3">Unit Price</th>
                <th className="text-left px-4 py-3">Discount %</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map(line => (
                <tr key={line.item_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{line.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{line.barcode}</p>
                  </td>
                  <td className="px-4 py-3">{qty(line.available, line.unit_type)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => update(line.item_id, { quantity: Math.max(0, Number(line.quantity) - (line.unit_type === 'kg' ? 0.25 : 1)) })} className="p-1 rounded hover:bg-slate-100" type="button"><Minus size={14} /></button>
                      <input className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm" type="number" step={line.unit_type === 'kg' ? '0.001' : '1'} min="0" value={line.quantity} onChange={e => update(line.item_id, { quantity: e.target.value })} />
                      <button onClick={() => update(line.item_id, { quantity: Number(line.quantity) + (line.unit_type === 'kg' ? 0.25 : 1) })} className="p-1 rounded hover:bg-slate-100" type="button"><Plus size={14} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unit_price}
                      onChange={e => update(line.item_id, { unit_price: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm" type="number" step="0.01" min="0" max="100" value={line.discount_percent ?? line.discount} onChange={e => update(line.item_id, { discount_percent: e.target.value })} />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{money(lineTotal(line))}</td>
                  <td className="px-4 py-3"><button onClick={() => remove(line.item_id)} type="button" className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 size={15} /></button></td>
                </tr>
              ))}
              {!cart.length && <tr><td colSpan="7" className="py-16 text-center text-slate-400">Scan an item to begin</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 h-fit space-y-3">
          <h2 className="font-semibold">Checkout</h2>
          <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Total discount %</label>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" step="0.01" min="0" max="100" value={cartDiscount} onChange={e => setCartDiscount(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">{money(cartDiscountAmount)} off</p>
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between text-lg"><span>Total</span><strong>{money(total)}</strong></div>
          <button onClick={checkout} disabled={checkingOut || !cart.length} className="w-full rounded-md bg-emerald-700 text-white py-3 font-semibold hover:bg-emerald-800 disabled:opacity-50">
            {checkingOut ? 'Completing...' : 'Complete Sale'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Daily Sales History</h2>
            <p className="text-xs text-slate-500">Review POS sales and sold items by date.</p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-500" />
            <input
              type="date"
              value={historyDate}
              onChange={e => setHistoryDate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 border-b border-slate-100">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500">Date</p>
            <p className="font-semibold">{dateOnly(historyDate)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500">Sales Total</p>
            <p className="font-semibold">{money(historyTotal)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500">Items Sold</p>
            <p className="font-semibold">{historyItems.toLocaleString(undefined, { maximumFractionDigits: 3 })}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Sale</th>
                <th className="text-left px-4 py-2">Items</th>
                <th className="text-left px-4 py-2">Subtotal</th>
                <th className="text-left px-4 py-2">Discount</th>
                <th className="text-left px-4 py-2">Total</th>
                <th className="text-left px-4 py-2">Cashier</th>
              </tr>
            </thead>
            <tbody>
              {salesHistory.map(sale => (
                <tr key={sale.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-semibold">#{sale.id}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {(sale.lines || []).map(line => (
                        <div key={line.id} className="flex items-center justify-between gap-4">
                          <span className="font-medium">{line.item_name}</span>
                          <span className="text-xs text-slate-500">{qty(line.quantity, line.unit_type)} · {money(line.line_total)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{money(sale.subtotal)}</td>
                  <td className="px-4 py-3">{money(sale.discount_total)}</td>
                  <td className="px-4 py-3 font-semibold">{money(sale.total)}</td>
                  <td className="px-4 py-3 text-slate-500">{sale.created_by_name || '-'}</td>
                </tr>
              ))}
              {!salesHistory.length && (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-400">No POS sales for this date</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
