'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface Profile {
  email: string
  full_name: string | null
}

interface Appointment {
  id: string
  service_name: string
  start_time: string
  end_time: string
  status: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/auth/signin')
          return
        }

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (!profileError && profileData) {
          setProfile({
            email: user.email || '',
            full_name: profileData.full_name
          })
        }

        // Fetch upcoming appointments
        const now = new Date().toISOString()
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(5)

        if (!appointmentsError && appointmentsData) {
          setAppointments(appointmentsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatAppointmentTime = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const dateStr = format(startDate, 'MMM d, yyyy')
    const timeStr = `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
    return { dateStr, timeStr }
  }

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
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}!
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-3">
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
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((appointment) => {
                      const { dateStr, timeStr } = formatAppointmentTime(
                        appointment.start_time,
                        appointment.end_time
                      )
                      return (
                        <div
                          key={appointment.id}
                          className="bg-white p-4 rounded-md shadow-sm border border-gray-100"
                        >
                          <h3 className="font-medium text-gray-900">
                            {appointment.service_name}
                          </h3>
                          <p className="text-sm text-gray-500">{dateStr}</p>
                          <p className="text-sm text-gray-500">{timeStr}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No upcoming appointments</p>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <p className="text-gray-500 text-sm">No recent activity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 