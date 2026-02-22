import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Tag, Truck, Users, Plus, Pencil, Trash2, Loader2, X, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import StatusBadge from '../components/StatusBadge'
import AddEditItemModal from '../components/AddEditItemModal'

const TABS = [
  { id: 'items',      label: 'Items',      icon: Package },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'suppliers',  label: 'Suppliers',  icon: Truck },
  { id: 'users',      label: 'Users',      icon: Users },
]

// ── Generic modal for categories / suppliers ──────────────────────────────────
function SimpleModal({ title, fields, initial, onClose, onSave }) {
  const [form,   setForm]   = useState(initial || {})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {f.type === 'textarea'
                ? <textarea className={`${cls} resize-none`} rows={2} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                : <input className={cls} type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              }
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Items Tab ─────────────────────────────────────────────────────────────────
function ItemsTab({ canEdit, isAdmin }) {
  const api = useApi()
  const navigate = useNavigate()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // null | 'add' | item

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/api/items?limit=100'); setItems(r.data.items) }
    catch { toast.error('Failed to load items') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [])

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    try { await api.delete(`/api/items/${item.id}`); toast.success('Item deleted'); fetchItems() }
    catch (err) { toast.error(err.response?.data?.error || 'Delete failed') }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{items.length} items</p>
        {canEdit && (
          <button onClick={() => setModal('add')} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 font-medium">
            <Plus size={14} /> Add Item
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-3 pr-4 text-xs font-semibold text-gray-500">Name / SKU</th>
              <th className="pb-3 pr-4 text-xs font-semibold text-gray-500">Category</th>
              <th className="pb-3 pr-4 text-xs font-semibold text-gray-500">Status</th>
              <th className="pb-3 pr-4 text-xs font-semibold text-gray-500">Qty / Min</th>
              <th className="pb-3 pr-4 text-xs font-semibold text-gray-500">Price</th>
              <th className="pb-3 text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-800 max-w-[180px] truncate">{item.name}</p>
                  {item.sku && <p className="text-xs text-gray-400">{item.sku}</p>}
                </td>
                <td className="py-3 pr-4 text-xs text-gray-500">{item.category_name || '—'}</td>
                <td className="py-3 pr-4"><StatusBadge status={item.status} /></td>
                <td className="py-3 pr-4 text-xs">
                  <span className={item.quantity <= item.min_quantity && item.status !== 'discontinued' ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                    {item.quantity}
                  </span>
                  <span className="text-gray-400"> / {item.min_quantity}</span>
                </td>
                <td className="py-3 pr-4 text-xs text-gray-600">
                  {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : '—'}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/inventory/${item.id}`)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50" title="View">
                      <ExternalLink size={14} />
                    </button>
                    {canEdit && (
                      <button onClick={() => setModal(item)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50" title="Edit">
                        <Pencil size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDelete(item)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <AddEditItemModal
          item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchItems(); toast.success(modal === 'add' ? 'Item added' : 'Item updated') }}
        />
      )}
    </>
  )
}

// ── Categories Tab ────────────────────────────────────────────────────────────
function CategoriesTab({ canEdit, isAdmin }) {
  const api = useApi()
  const [cats,    setCats]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/api/categories'); setCats(r.data) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [])

  const handleSave = async (form) => {
    try {
      if (modal === 'add') await api.post('/api/categories', form)
      else await api.put(`/api/categories/${modal.id}`, form)
      toast.success(modal === 'add' ? 'Category created' : 'Updated')
      setModal(null); fetch()
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed') }
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"?`)) return
    try { await api.delete(`/api/categories/${cat.id}`); toast.success('Deleted'); fetch() }
    catch (err) { toast.error(err.response?.data?.error || 'Delete failed') }
  }

  const FIELDS = [
    { key: 'name',        label: 'Name',        required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{cats.length} categories</p>
        {canEdit && (
          <button onClick={() => setModal('add')} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 font-medium">
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cats.map(cat => (
          <div key={cat.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-800">{cat.name}</p>
              {cat.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cat.description}</p>}
              <p className="text-xs text-gray-400 mt-1">{cat.item_count} items</p>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setModal(cat)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil size={13} /></button>
                {isAdmin && <button onClick={() => handleDelete(cat)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>}
              </div>
            )}
          </div>
        ))}
      </div>
      {modal && <SimpleModal title={modal === 'add' ? 'Add Category' : 'Edit Category'} fields={FIELDS} initial={modal === 'add' ? {} : modal} onClose={() => setModal(null)} onSave={handleSave} />}
    </>
  )
}

// ── Suppliers Tab ─────────────────────────────────────────────────────────────
function SuppliersTab({ canEdit, isAdmin }) {
  const api = useApi()
  const [sups,    setSups]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/api/suppliers'); setSups(r.data) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [])

  const handleSave = async (form) => {
    try {
      if (modal === 'add') await api.post('/api/suppliers', form)
      else await api.put(`/api/suppliers/${modal.id}`, form)
      toast.success(modal === 'add' ? 'Supplier created' : 'Updated')
      setModal(null); fetch()
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed') }
  }

  const handleDelete = async (sup) => {
    if (!window.confirm(`Delete "${sup.name}"?`)) return
    try { await api.delete(`/api/suppliers/${sup.id}`); toast.success('Deleted'); fetch() }
    catch (err) { toast.error(err.response?.data?.error || 'Delete failed') }
  }

  const FIELDS = [
    { key: 'name',    label: 'Name',    required: true },
    { key: 'email',   label: 'Email',   type: 'email' },
    { key: 'phone',   label: 'Phone' },
    { key: 'address', label: 'Address', type: 'textarea' },
  ]

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{sups.length} suppliers</p>
        {canEdit && (
          <button onClick={() => setModal('add')} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 font-medium">
            <Plus size={14} /> Add Supplier
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {sups.map(sup => (
          <div key={sup.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-800">{sup.name}</p>
              {sup.email && <p className="text-xs text-gray-500">{sup.email}</p>}
              {sup.phone && <p className="text-xs text-gray-500">{sup.phone}</p>}
              {sup.address && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{sup.address}</p>}
              <p className="text-xs text-gray-400 mt-1">{sup.item_count} items</p>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setModal(sup)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil size={13} /></button>
                {isAdmin && <button onClick={() => handleDelete(sup)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>}
              </div>
            )}
          </div>
        ))}
      </div>
      {modal && <SimpleModal title={modal === 'add' ? 'Add Supplier' : 'Edit Supplier'} fields={FIELDS} initial={modal === 'add' ? {} : modal} onClose={() => setModal(null)} onSave={handleSave} />}
    </>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const api = useApi()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(null)

  useEffect(() => {
    api.get('/api/users')
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    setSaving(userId)
    try {
      await api.put(`/api/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('Role updated')
    } catch { toast.error('Failed to update role') }
    finally { setSaving(null) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="pb-3 pr-4 text-xs font-semibold text-gray-500">Email</th>
            <th className="pb-3 pr-4 text-xs font-semibold text-gray-500">Role</th>
            <th className="pb-3 text-xs font-semibold text-gray-500">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map(u => (
            <tr key={u.id} className="hover:bg-gray-50/50">
              <td className="py-3 pr-4 text-gray-700">{u.email}</td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={saving === u.id}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                  {saving === u.id && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                </div>
              </td>
              <td className="py-3 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useUser()
  const navigate = useNavigate()
  const role     = user?.publicMetadata?.role || 'staff'
  const canEdit  = ['admin', 'manager'].includes(role)
  const isAdmin  = role === 'admin'

  const [activeTab, setActiveTab] = useState('items')

  if (!canEdit) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="font-medium">Access denied</p>
        <p className="text-sm mt-1">Admin and Manager roles required</p>
        <button onClick={() => navigate('/inventory')} className="mt-4 text-indigo-600 text-sm hover:underline">
          Back to Inventory
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage inventory, categories, suppliers, and users</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map(tab => {
            if (tab.id === 'users' && !isAdmin) return null
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'items'      && <ItemsTab      canEdit={canEdit} isAdmin={isAdmin} />}
          {activeTab === 'categories' && <CategoriesTab canEdit={canEdit} isAdmin={isAdmin} />}
          {activeTab === 'suppliers'  && <SuppliersTab  canEdit={canEdit} isAdmin={isAdmin} />}
          {activeTab === 'users'      && isAdmin && <UsersTab />}
        </div>
      </div>
    </div>
  )
}
