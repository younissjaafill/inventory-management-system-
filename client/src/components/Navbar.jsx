import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, CreditCard, Menu, ReceiptText, ShoppingBag, WalletCards, X, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/inventory', label: 'Stock', icon: Boxes },
  { to: '/pos', label: 'POS', icon: CreditCard },
  { to: '/purchases', label: 'Purchases', icon: ShoppingBag },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/admin', label: 'Admin', icon: WalletCards },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  const signOut = () => {
    logout()
    navigate('/sign-in')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-emerald-800">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-emerald-700 text-white">P&C</span>
          <span>Pets&Claws</span>
        </button>

        <div className="hidden lg:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{user?.username}</span>
          <button onClick={signOut} className="p-2 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>

        <button className="lg:hidden p-2 rounded-md hover:bg-slate-100" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-100 p-3 bg-white space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkClass} onClick={() => setOpen(false)}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
