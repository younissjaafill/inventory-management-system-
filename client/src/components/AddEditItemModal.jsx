import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'

const STATUSES = [
  { value: 'in_stock',     label: 'In Stock' },
  { value: 'low_stock',    label: 'Low Stock' },
  { value: 'ordered',      label: 'Ordered' },
  { value: 'discontinued', label: 'Discontinued' },
]

const EMPTY = {
  name: '', sku: '', description: '', category_id: '', supplier_id: '',
  quantity: 0, min_quantity: 5, unit_price: '', status: '',
  image_url: '', location: '',
}

export default function AddEditItemModal({ item, onClose, onSaved }) {
  const api = useApi()
  const [form, setForm]           = useState(item ? { ...item, category_id: item.category_id || '', supplier_id: item.supplier_id || '' } : EMPTY)
  const [categories, setCategories] = useState([])
  const [suppliers,  setSuppliers]  = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/api/categories'),
      api.get('/api/suppliers'),
    ]).then(([c, s]) => {
      setCategories(c.data)
      setSuppliers(s.data)
    }).catch(() => {})
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
        quantity:    Number(form.quantity),
        min_quantity: Number(form.min_quantity),
        unit_price:  form.unit_price !== '' ? Number(form.unit_price) : null,
        status:      form.status || undefined,
      }
      if (item) {
        await api.put(`/api/items/${item.id}`, payload)
      } else {
        await api.post('/api/items', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-800 text-lg">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Row 1: Name + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Dell Laptop" />
            </div>
            <div>
              <label className={labelCls}>SKU</label>
              <input className={inputCls} value={form.sku || ''} onChange={e => set('sku', e.target.value)} placeholder="e.g. ELEC-001" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
          </div>

          {/* Row 2: Category + Supplier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category_id || ''} onChange={e => set('category_id', e.target.value)}>
                <option value="">— None —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Supplier</label>
              <select className={inputCls} value={form.supplier_id || ''} onChange={e => set('supplier_id', e.target.value)}>
                <option value="">— None —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Quantity + Min Quantity + Price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Quantity</label>
              <input className={inputCls} type="number" min={0} value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Min Qty</label>
              <input className={inputCls} type="number" min={0} value={form.min_quantity} onChange={e => set('min_quantity', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Unit Price ($)</label>
              <input className={inputCls} type="number" min={0} step="0.01" value={form.unit_price || ''} onChange={e => set('unit_price', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Row 4: Status + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status || ''} onChange={e => set('status', e.target.value)}>
                <option value="">Auto (based on qty)</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="e.g. Warehouse A" />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className={labelCls}>Image URL</label>
            <input className={inputCls} value={form.image_url || ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
