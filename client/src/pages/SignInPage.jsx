import { SignIn } from '@clerk/clerk-react'
import { BarChart3 } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <BarChart3 size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">InventoryOS</h1>
          <p className="text-indigo-300 mt-2 text-sm">Sign in to manage your inventory</p>
        </div>

        {/* Clerk SignIn component */}
        <div className="flex justify-center">
          <SignIn routing="hash" afterSignInUrl="/inventory" afterSignUpUrl="/inventory" />
        </div>
      </div>
    </div>
  )
}
