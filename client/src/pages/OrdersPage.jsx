import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Loader2, X, CheckCircle, XCircle, Package, Truck, Calendar, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'

const ORDER_STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  shipped:   'bg-blue-100 text-blue-700 border-blue-200',
  received:  'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

function OrderStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${ORDER_STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

// ── Create Order Modal ────────────────────────────────────────────────────────
function CreateOrderModal({ onClose, onCreated }) {
  const api = useApi()
  const [items,     setItems]     = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [form, setForm] = useState({
    item_id: '', supplier_id: '', quantity_ordered: '', expected_at: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    Promise.all([api.get('/api/items?limit=200'), api.get('/api/suppliers')])
      .then(([i, s]) => { setItems(i.data.items); setSuppliers(s.data) })
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.item_id || !form.quantity_ordered) return setError('Item and quantity are required')
    setSaving(true); setError('')
    try {
      await api.post('/api/orders', {
        item_id:          Number(form.item_id),
        supplier_id:      form.supplier_id || null,
        quantity_ordered: Number(form.quantity_ordered),
        expected_at:      form.expected_at || null,
        notes:            form.notes || null,
      })
      onCreated()
    } catch (err) { setError(err.response?.data?.error || 'Failed to create order') }
    finally { setSaving(false) }
  }

  const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-800 text-lg">Create Restock Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Item <span className="text-red-500">*</span></label>
            <select className={cls} value={form.item_id} onChange={e => set('item_id', e.target.value)} required>
              <option value="">— Select item —</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} {i.sku ? `(${i.sku})` : ''} — qty: {i.quantity}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
            <select className={cls} value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
              <option value="">— None —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty to Order <span className="text-red-500">*</span></label>
              <input className={cls} type="number" min={1} value={form.quantity_ordered} onChange={e => set('quantity_ordered', e.target.value)} required placeholder="e.g. 50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected By</label>
              <input className={cls} type="date" value={form.expected_at} onChange={e => set('expected_at', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea className={`${cls} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
          </div>
        </form>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />} Create Order
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Receive Modal ─────────────────────────────────────────────────────────────
function ReceiveModal({ order, onClose, onReceived }) {
  const api = useApi()
  const [qty,    setQty]    = useState(order.quantity_ordered - order.quantity_received)
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await api.patch(`/api/orders/${order.id}/receive`, { quantity_received: Number(qty), notes: notes || undefined })
      onReceived()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Receive Order #{order.id}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">Item: <strong>{order.item_name}</strong></p>
          <p className="text-sm text-gray-600">Ordered: <strong>{order.quantity_ordered}</strong> · Already received: <strong>{order.quantity_received}</strong></p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity Received</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} <CheckCircle size={14} /> Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main OrdersPage ───────────────────────────────────────────────────────────
export default function OrdersPage() {
  const api      = useApi()
  const navigate = useNavigate()
  const { user } = useUser()
  const role     = user?.publicMetadata?.role || 'staff'
  const canEdit  = ['admin', 'manager'].includes(role)
  const isAdmin  = role === 'admin'

  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate,   setShowCreate]   = useState(false)
  const [receiveOrder, setReceiveOrder] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await api.get(`/api/orders${params}`)
      setOrders(res.data)
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return
    try {
      await api.patch(`/api/orders/${orderId}/cancel`)
      toast.success('Order cancelled')
      fetchOrders()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  if (!canEdit) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="font-medium">Access denied</p>
        <button onClick={() => navigate('/inventory')} className="mt-4 text-indigo-600 text-sm hover:underline">Back to Inventory</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restock Orders</h1>
          <p className="text-sm text-gray-500">{orders.length} orders</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
        >
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'shipped', 'received', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={36} className="mx-auto mb-3 opacity-40" />
            <p>No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50/80">
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">Item</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">Supplier</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">Ordered</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">Expected</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-400 text-xs">#{order.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-800 max-w-[160px] truncate">{order.item_name}</p>
                          {order.item_sku && <p className="text-xs text-gray-400">{order.item_sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Truck size={12} className="text-gray-400" />
                        {order.supplier_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span className="font-medium">{order.quantity_ordered}</span>
                      {order.quantity_received > 0 && <span className="text-green-600"> (+{order.quantity_received})</span>}
                    </td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(order.ordered_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {order.expected_at ? new Date(order.expected_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/inventory/${order.item_id}`)}
                          className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          title="View item"
                        >
                          <ExternalLink size={13} />
                        </button>
                        {['pending', 'shipped'].includes(order.status) && (
                          <button
                            onClick={() => setReceiveOrder(order)}
                            className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                            title="Mark received"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}
                        {isAdmin && ['pending', 'shipped'].includes(order.status) && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Cancel order"
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            fetchOrders()
            toast.success('Order created — item status set to Ordered')
          }}
        />
      )}

      {receiveOrder && (
        <ReceiveModal
          order={receiveOrder}
          onClose={() => setReceiveOrder(null)}
          onReceived={() => {
            setReceiveOrder(null)
            fetchOrders()
            toast.success('Stock received and inventory updated!')
          }}
        />
      )}
    </div>
  )
}
