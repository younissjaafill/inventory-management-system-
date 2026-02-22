import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Search, Plus, Package, AlertTriangle, ShoppingCart, Ban, RefreshCw, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import StatusBadge from '../components/StatusBadge'
import AddEditItemModal from '../components/AddEditItemModal'

const STATUSES = [
  { value: '',             label: 'All Statuses' },
  { value: 'in_stock',     label: 'In Stock' },
  { value: 'low_stock',    label: 'Low Stock' },
  { value: 'ordered',      label: 'Ordered' },
  { value: 'discontinued', label: 'Discontinued' },
]

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function ItemCard({ item, onEdit, canEdit, onClick }) {
  const stockPct = item.min_quantity > 0
    ? Math.min(100, Math.round((item.quantity / item.min_quantity) * 100))
    : 100

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
      onClick={() => onClick(item.id)}
    >
      {/* Image or placeholder */}
      <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-xl flex items-center justify-center overflow-hidden">
        {item.image_url
          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
          : <Package size={36} className="text-slate-400" />
        }
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Status */}
        <StatusBadge status={item.status} />

        {/* Name */}
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{item.name}</h3>

        {/* SKU + Category */}
        <div className="text-xs text-gray-400 space-y-0.5">
          {item.sku && <p>SKU: {item.sku}</p>}
          {item.category_name && (
            <span className="inline-block bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-medium">
              {item.category_name}
            </span>
          )}
        </div>

        {/* Quantity bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Qty: <strong className="text-gray-700">{item.quantity}</strong></span>
            <span>Min: {item.min_quantity}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

        {/* Price */}
        {item.unit_price && (
          <p className="text-sm font-semibold text-gray-700">
            ${Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const api      = useApi()
  const navigate = useNavigate()
  const { user } = useUser()
  const role     = user?.publicMetadata?.role || 'staff'
  const canEdit  = ['admin', 'manager'].includes(role)

  const [items,       setItems]       = useState([])
  const [categories,  setCategories]  = useState([])
  const [stats,       setStats]       = useState({ total: 0, in_stock: 0, low_stock: 0, ordered: 0 })
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)

  // Filters
  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [catFilter,   setCatFilter]   = useState('')
  const [page,        setPage]        = useState(1)
  const [total,       setTotal]       = useState(0)
  const LIMIT = 24

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: LIMIT, page })
      if (search)       params.append('q', search)
      if (statusFilter) params.append('status', statusFilter)
      if (catFilter)    params.append('category_id', catFilter)

      const res = await api.get(`/api/items?${params}`)
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, catFilter, page])

  const fetchStats = useCallback(async () => {
    try {
      const [all, inStock, lowStock, ordered] = await Promise.all([
        api.get('/api/items?limit=1'),
        api.get('/api/items?status=in_stock&limit=1'),
        api.get('/api/items?status=low_stock&limit=1'),
        api.get('/api/items?status=ordered&limit=1'),
      ])
      setStats({
        total:     all.data.total,
        in_stock:  inStock.data.total,
        low_stock: lowStock.data.total,
        ordered:   ordered.data.total,
      })
    } catch {}
  }, [])

  useEffect(() => {
    api.get('/api/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { fetchStats() }, [])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, statusFilter, catFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchItems()
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{total} items total</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Item
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Package}       label="Total Items"  value={stats.total}     color="bg-indigo-500" />
        <StatCard icon={Package}       label="In Stock"     value={stats.in_stock}  color="bg-green-500" />
        <StatCard icon={AlertTriangle} label="Low Stock"    value={stats.low_stock} color="bg-yellow-500" />
        <StatCard icon={ShoppingCart}  label="On Order"     value={stats.ordered}   color="bg-blue-500" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, SKU, description..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Filter size={14} /> Filter
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setStatusFilter(''); setCatFilter(''); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} />
          </button>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Ban size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No items found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              canEdit={canEdit}
              onClick={id => navigate(`/inventory/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}

      {/* Add Item Modal */}
      {showModal && (
        <AddEditItemModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchItems()
            fetchStats()
            toast.success('Item added successfully')
          }}
        />
      )}
    </div>
  )
}
