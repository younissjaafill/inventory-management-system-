import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'

const tabs = ['categories', 'suppliers', 'expense categories', 'users']
const permissionOptions = [
  { key: 'pos', label: 'POS' },
  { key: 'stock', label: 'Stock' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'dashboard', label: 'Dashboard' },
]
const defaultStaffPermissions = { pos: true, stock: false, purchases: false, expenses: false, dashboard: false, admin: false }

export default function AdminPage() {
  const api = useApi()
  const [active, setActive] = useState('categories')
  const [data, setData] = useState([])
  const [form, setForm] = useState({})

  const endpoint = {
    categories: '/api/categories',
    suppliers: '/api/suppliers',
    'expense categories': '/api/expenses/categories',
    users: '/api/users',
  }[active]

  const fetch = async () => {
    const res = await api.get(endpoint)
    setData(res.data)
  }

  useEffect(() => { fetch().catch(() => {}) }, [active])

  const create = async (e) => {
    e.preventDefault()
    try {
      await api.post(endpoint, form)
      toast.success('Saved')
      setForm({})
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    }
  }

  const updateUser = async (user, patch) => {
    try {
      await api.patch(`/api/users/${user.id}`, patch)
      toast.success('User updated')
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    }
  }

  const setUserRole = (role) => {
    setForm({
      ...form,
      role,
      permissions: role === 'admin' ? {} : { ...defaultStaffPermissions, ...(form.permissions || {}) },
    })
  }

  const toggleFormPermission = (key) => {
    setForm({
      ...form,
      permissions: {
        ...defaultStaffPermissions,
        ...(form.permissions || {}),
        [key]: !(form.permissions || defaultStaffPermissions)[key],
      },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-slate-500">Manage store setup and admin users.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex overflow-x-auto gap-2 border-b border-slate-100 p-3">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setActive(tab); setForm({}) }}
              className={`min-w-32 px-4 py-2.5 rounded-md text-sm font-semibold capitalize border transition-colors ${
                active === tab
                  ? 'bg-emerald-700 border-emerald-700 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-4">
          <form onSubmit={create} className="grid md:grid-cols-5 gap-3 items-end">
            {active === 'users' ? (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Username</label>
                  <input required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Password</label>
                  <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="1234 default" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Role</label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.role || 'staff'} onChange={e => setUserRole(e.target.value)}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {(form.role || 'staff') === 'staff' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Allowed modules</label>
                    <div className="flex flex-wrap gap-2">
                      {permissionOptions.map(option => (
                        <label key={option.key} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs">
                          <input type="checkbox" checked={Boolean((form.permissions || defaultStaffPermissions)[option.key])} onChange={() => toggleFormPermission(option.key)} />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : active === 'suppliers' ? (
              <>
                <Input label="Name" value={form.name || ''} onChange={value => setForm({ ...form, name: value })} required />
                <Input label="Email" value={form.email || ''} onChange={value => setForm({ ...form, email: value })} />
                <Input label="Phone" value={form.phone || ''} onChange={value => setForm({ ...form, phone: value })} />
                <Input label="Address" value={form.address || ''} onChange={value => setForm({ ...form, address: value })} />
              </>
            ) : (
              <>
                <Input label="Name" value={form.name || ''} onChange={value => setForm({ ...form, name: value })} required />
                {active === 'categories' && <Input label="Description" value={form.description || ''} onChange={value => setForm({ ...form, description: value })} />}
              </>
            )}
            <button className="rounded-md bg-emerald-700 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-800 inline-flex items-center justify-center gap-2">
              <Plus size={15} /> Add
            </button>
          </form>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {data.map(row => (
                  <tr key={row.id} className="border-t first:border-t-0 border-slate-100">
                    <td className="px-4 py-3 font-semibold">{row.name || row.username}</td>
                    {active === 'users' ? (
                      <>
                        <td className="px-4 py-3 text-slate-500">
                          <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={row.role} onChange={e => updateUser(row, { role: e.target.value })}>
                            <option value="staff">staff</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {row.role === 'admin' ? (
                            <span className="text-xs font-semibold text-emerald-700">All access</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {permissionOptions.map(option => (
                                <label key={option.key} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(row.permissions?.[option.key])}
                                    onChange={() => updateUser(row, { permissions: { ...row.permissions, [option.key]: !row.permissions?.[option.key] } })}
                                  />
                                  {option.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{row.active === false ? 'inactive' : 'active'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-slate-500">{row.description || row.email || row.role || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{row.phone || (row.active === false ? 'inactive' : '')}</td>
                        <td className="px-4 py-3 text-slate-500">{row.item_count !== undefined ? `${row.item_count} items` : ''}</td>
                      </>
                    )}
                  </tr>
                ))}
                {!data.length && <tr><td className="px-4 py-8 text-center text-slate-400">No records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input required={required} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
