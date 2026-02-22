import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUser, UserButton, SignedIn } from '@clerk/clerk-react'
import { Package, ClipboardList, Settings, Bot, Menu, X, BarChart3 } from 'lucide-react'

export default function Navbar() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const role = user?.publicMetadata?.role || 'staff'
  const isAdminOrManager = ['admin', 'manager'].includes(role)

  const navLinks = [
    { to: '/inventory', label: 'Inventory',    icon: Package },
    ...(isAdminOrManager ? [{ to: '/orders', label: 'Orders',      icon: ClipboardList }] : []),
    ...(isAdminOrManager ? [{ to: '/admin',  label: 'Admin',       icon: Settings }] : []),
    { to: '/ai',        label: 'AI Assistant', icon: Bot },
  ]

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-100 text-indigo-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  const roleBadge = (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
      role === 'admin'   ? 'bg-purple-100 text-purple-700' :
      role === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                           'bg-gray-100 text-gray-600'
    }`}>
      {role}
    </span>
  )

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 font-bold text-indigo-700 text-lg hover:opacity-80 transition-opacity"
          >
            <BarChart3 size={22} />
            <span>InventoryOS</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Desktop right: role badge + avatar */}
          <div className="hidden md:flex items-center gap-3">
            {roleBadge}
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>

          {/* Mobile: avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <SignedIn>
              <UserButton />
            </SignedIn>
            <button
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          <div className="pt-3 border-t border-gray-100">
            {roleBadge}
          </div>
        </div>
      )}
    </nav>
  )
}
