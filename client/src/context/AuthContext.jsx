import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { setAuthToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pc_token'))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('pc_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    setAuthToken(token)
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/api/auth/me')
      .then(res => {
        setUser(res.data.user)
        localStorage.setItem('pc_user', JSON.stringify(res.data.user))
      })
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [token])

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password })
    localStorage.setItem('pc_token', res.data.token)
    localStorage.setItem('pc_user', JSON.stringify(res.data.user))
    setToken(res.data.token)
    setUser(res.data.user)
  }

  const logout = () => {
    localStorage.removeItem('pc_token')
    localStorage.removeItem('pc_user')
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, loading, login, logout, isAuthenticated: Boolean(token && user) }), [token, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
