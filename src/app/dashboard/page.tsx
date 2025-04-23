'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface Profile {
  email: string
  full_name: string | null
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) {
          router.push('/auth/signin')
          return
        }

        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('email', user.email)
          .single()

        if (adminError || !adminData) {
          // User is not an admin, redirect to home
          router.push('/')
          return
        }

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                full_name: '',
                updated_at: new Date().toISOString()
              })

            setProfile({
              email: user.email || '',
              full_name: ''
            })
          } else {
            throw profileError
          }
        } else {
          setProfile({
            email: user.email || '',
            full_name: profileData.full_name
          })
        }
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center justify-center">
            Πίνακας ελέγχου διαχειριστή {profile?.full_name ? ` - ${profile.full_name}` : ''}
            </h1>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* Quick Actions */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Γρήγορες Ενέργειες</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/dashboard/admins')}
                    className="w-full bg-[#1A1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Διαχείριση Διαχειριστών
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/manage-appointments')}
                    className="w-full bg-[#1A1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Διαχείριση των ραντεβού
                  </button>
                  <button
                    onClick={() => router.push('/bookings')}
                    className="w-full bg-[#1A1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Κλείσε Ραντεβού
                  </button>
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                  >
                    Προβολή Προφίλ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 