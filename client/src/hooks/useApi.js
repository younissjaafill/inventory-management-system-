import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import api, { setupApiInterceptor } from '../lib/api'

export function useApi() {
  const { getToken } = useAuth()
  useEffect(() => { setupApiInterceptor(getToken) }, [getToken])
  return api
}
