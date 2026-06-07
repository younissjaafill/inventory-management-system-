import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import SignInPage from './pages/SignInPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ItemDetailPage from './pages/ItemDetailPage'
import POSPage from './pages/POSPage'
import PurchasesPage from './pages/PurchasesPage'
import ExpensesPage from './pages/ExpensesPage'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading Pets&Claws...</div>
  if (!isAuthenticated) return <Navigate to="/sign-in" replace />
  return children
}

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/sign-in" element={isAuthenticated ? <Navigate to="/" replace /> : <SignInPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/inventory/:id" element={<ItemDetailPage />} />
                  <Route path="/pos" element={<POSPage />} />
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}
