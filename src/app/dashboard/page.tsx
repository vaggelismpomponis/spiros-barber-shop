'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface Profile {
  email: string
  full_name: string | null
  isAdmin?: boolean
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
        if (userError) {
          setError(`Auth error: ${userError.message}`)
          return
        }
        if (!user) {
          router.push('/auth/signin')
          return
        }

        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admins')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!adminData) {
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
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                full_name: '',
                updated_at: new Date().toISOString()
              })
              .select('full_name')
              .single()

            if (createError) {
              setError(`Failed to create profile: ${createError.message}`)
            } else {
              setProfile({
                email: user.email || '',
                full_name: '',
                isAdmin: true
              })
            }
          } else {
            setError(`Profile error: ${profileError.message}`)
          }
        } else if (profileData) {
          setProfile({
            email: user.email || '',
            full_name: profileData.full_name,
            isAdmin: true
          })
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold mb-6">
              Admin Dashboard{profile?.full_name ? ` - ${profile.full_name}` : ''}
            </h1>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* Quick Actions */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/dashboard/admins')}
                    className="w-full bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Manage Admins
                  </button>
                  <button
                    onClick={() => router.push('/bookings')}
                    className="w-full bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Book Appointment
                  </button>
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      fetch('/api/test')
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            window.location.reload()
                          } else {
                            console.error('Test appointment error:', data.error)
                          }
                        })
                    }}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
                  >
                    Create Test Appointment
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