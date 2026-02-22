import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import InventoryPage from './pages/InventoryPage'
import ItemDetailPage from './pages/ItemDetailPage'
import AdminPage from './pages/AdminPage'
import OrdersPage from './pages/OrdersPage'
import AIChatPage from './pages/AIChatPage'
import SignInPage from './pages/SignInPage'

function Footer() {
  return (
    <footer className="mt-auto py-4 text-center text-xs text-gray-400">
      Made with{' '}
      <span className="inline-block text-red-500 animate-pulse">♥</span>
      {' '}by{' '}
      <span className="font-semibold text-gray-500">Aspire</span>
      {' '}© 2026
    </footer>
  )
}

// Every route except /sign-in requires authentication
function ProtectedRoute({ children }) {
  return (
    <>
      <SignedOut>
        <Navigate to="/sign-in" replace />
      </SignedOut>
      <SignedIn>{children}</SignedIn>
    </>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* ── Public ────────────────────────────────── */}
        <Route path="/sign-in" element={<SignInPage />} />

        {/* ── Protected (need sign-in) ──────────────── */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
                <Routes>
                  <Route path="/"           element={<Navigate to="/inventory" replace />} />
                  <Route path="/inventory"  element={<InventoryPage />} />
                  <Route path="/inventory/:id" element={<ItemDetailPage />} />
                  <Route path="/orders"     element={<OrdersPage />} />
                  <Route path="/admin"      element={<AdminPage />} />
                  <Route path="/ai"         element={<AIChatPage />} />
                  <Route path="*"           element={<Navigate to="/inventory" replace />} />
                </Routes>
              </main>
              <Footer />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}
