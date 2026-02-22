import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  ArrowLeft, Package, MapPin, DollarSign, Hash, Tag, Truck,
  Sparkles, Loader2, Pencil, Trash2, MinusCircle, PlusCircle, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import StatusBadge from '../components/StatusBadge'
import AddEditItemModal from '../components/AddEditItemModal'

function InfoRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm text-gray-700 font-medium">{value}</p>
      </div>
    </div>
  )
}

const ACTION_COLORS = {
  created:          'bg-green-100 text-green-700',
  updated:          'bg-blue-100 text-blue-700',
  quantity_changed: 'bg-yellow-100 text-yellow-700',
  status_changed:   'bg-purple-100 text-purple-700',
}

export default function ItemDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const api      = useApi()
  const { user } = useUser()
  const role     = user?.publicMetadata?.role || 'staff'
  const canEdit  = ['admin', 'manager'].includes(role)
  const isAdmin  = role === 'admin'

  const [item,        setItem]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showEdit,    setShowEdit]    = useState(false)
  const [aiLoading,   setAiLoading]   = useState(false)

  // Quantity adjust state
  const [adjusting,   setAdjusting]   = useState(false)
  const [adjustment,  setAdjustment]  = useState(0)
  const [adjNotes,    setAdjNotes]    = useState('')
  const [adjSaving,   setAdjSaving]   = useState(false)

  const fetchItem = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/items/${id}`)
      setItem(res.data)
    } catch {
      toast.error('Item not found')
      navigate('/inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItem() }, [id])

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/api/items/${id}`)
      toast.success('Item deleted')
      navigate('/inventory')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  const handleAiInsights = async () => {
    setAiLoading(true)
    try {
      const res = await api.post(`/api/ai/insights/${id}`)
      setItem(prev => ({ ...prev, ai_insights: res.data.insights }))
      toast.success('AI insights generated')
    } catch {
      toast.error('Failed to generate insights')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAdjustQty = async () => {
    if (adjustment === 0) return toast.error('Adjustment cannot be zero')
    setAdjSaving(true)
    try {
      await api.patch(`/api/items/${id}/quantity`, { adjustment: Number(adjustment), notes: adjNotes || undefined })
      toast.success(`Quantity ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`)
      setAdjusting(false)
      setAdjustment(0)
      setAdjNotes('')
      fetchItem()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust quantity')
    } finally {
      setAdjSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  )

  if (!item) return null

  const stockPct = item.min_quantity > 0
    ? Math.min(100, Math.round((item.quantity / item.min_quantity) * 100))
    : 100

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/inventory')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Inventory
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: image + details */}
        <div className="md:col-span-1 space-y-4">
          {/* Image */}
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl h-48 flex items-center justify-center overflow-hidden border border-gray-200">
            {item.image_url
              ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" onError={e => { e.target.style.display = 'none' }} />
              : <Package size={56} className="text-slate-400" />
            }
          </div>

          {/* Info card */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2">
            <InfoRow icon={Hash}       label="SKU"      value={item.sku} />
            <InfoRow icon={Tag}        label="Category" value={item.category_name} />
            <InfoRow icon={Truck}      label="Supplier" value={item.supplier_name} />
            <InfoRow icon={MapPin}     label="Location" value={item.location} />
            <InfoRow icon={DollarSign} label="Unit Price"
              value={item.unit_price
                ? `$${Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : null}
            />
          </div>

          {/* Actions */}
          {(canEdit || true) && (
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button
                onClick={() => setAdjusting(a => !a)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
              >
                <PlusCircle size={14} /> Adjust Qty
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}

          {/* Quantity adjust panel */}
          {adjusting && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-800">Adjust Quantity</p>
              <p className="text-xs text-yellow-700">Current: <strong>{item.quantity}</strong> · Min: {item.min_quantity}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setAdjustment(a => a - 1)} className="p-1 text-gray-500 hover:text-red-500"><MinusCircle size={18} /></button>
                <input
                  type="number"
                  value={adjustment}
                  onChange={e => setAdjustment(parseInt(e.target.value) || 0)}
                  className="w-20 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
                <button onClick={() => setAdjustment(a => a + 1)} className="p-1 text-gray-500 hover:text-green-500"><PlusCircle size={18} /></button>
              </div>
              <input
                type="text"
                placeholder="Notes (optional)"
                value={adjNotes}
                onChange={e => setAdjNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdjustQty}
                  disabled={adjSaving || adjustment === 0}
                  className="flex-1 bg-yellow-500 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {adjSaving && <Loader2 size={12} className="animate-spin" />}
                  Apply ({adjustment > 0 ? '+' : ''}{adjustment})
                </button>
                <button onClick={() => { setAdjusting(false); setAdjustment(0); setAdjNotes('') }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-white">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: main content */}
        <div className="md:col-span-2 space-y-4">
          {/* Title + status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{item.name}</h1>
              <StatusBadge status={item.status} size="lg" />
            </div>

            {/* Stock bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Stock Level: <strong className="text-gray-700">{item.quantity}</strong> units</span>
                <span>Min threshold: {item.min_quantity}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.status === 'discontinued' ? 'bg-gray-300' :
                    stockPct >= 100 ? 'bg-green-400' :
                    stockPct >= 50  ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(100, stockPct)}%` }}
                />
              </div>
            </div>

            {item.description && (
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">{item.description}</p>
            )}

            <p className="mt-3 text-xs text-gray-400">
              Added {new Date(item.created_at).toLocaleDateString()} ·
              Updated {new Date(item.updated_at).toLocaleDateString()}
            </p>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-500" /> AI Insights
              </h2>
              <button
                onClick={handleAiInsights}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {item.ai_insights ? 'Regenerate' : 'Generate Insights'}
              </button>
            </div>
            {item.ai_insights ? (
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                {item.ai_insights}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No insights yet. Click "Generate Insights" to get AI-powered analysis for this item.
              </p>
            )}
          </div>

          {/* History */}
          {item.history && item.history.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Clock size={16} className="text-gray-400" /> Recent History
              </h2>
              <div className="space-y-2">
                {item.history.map(h => (
                  <div key={h.id} className="flex items-start gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${ACTION_COLORS[h.action] || 'bg-gray-100 text-gray-600'}`}>
                      {h.action.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      {h.notes && <p className="text-gray-600">{h.notes}</p>}
                      {h.old_values && h.new_values && (
                        <p className="text-gray-400">
                          {JSON.stringify(h.old_values)} → {JSON.stringify(h.new_values)}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-400 whitespace-nowrap shrink-0">
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <AddEditItemModal
          item={item}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            fetchItem()
            toast.success('Item updated')
          }}
        />
      )}
    </div>
  )
}
