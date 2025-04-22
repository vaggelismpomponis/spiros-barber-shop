'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function SessionProvider() {
  const supabase = createClientComponentClient()

  useEffect(() => {
    const setupSessionRefresh = () => {
      // Set up periodic session refresh
      const refreshInterval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.auth.refreshSession()
        }
      }, 1800000) // Refresh every 30 minutes

      return () => clearInterval(refreshInterval)
    }

    setupSessionRefresh()
  }, [])

  return null // This component doesn't render anything
} 