'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'

interface Appointment {
  id: number
  user_id: string
  service_id: number
  date: string
  time: string
  status: string
  cal_event_uid: string
  service: {
    name: string
    duration: number
    price: number
  }
  user: {
    email: string
    full_name?: string
    phone?: string
  }
}

export default function AppointmentsManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClientComponentClient()

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('admins')
            .select('email')
            .eq('email', user.email)
            .single()

          if (error) {
            console.error('Error checking admin status:', error)
            return
          }

          setIsAdmin(!!data)
        }
      } catch (error) {
        console.error('Error in checkAdmin:', error)
      }
    }

    checkAdmin()
  }, [])

  // Fetch all appointments for admins
  const fetchAppointments = async () => {
    try {
      console.log('Starting to fetch appointments...');
      
      // Get appointments with services
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          user_id,
          service_id,
          date,
          time,
          status,
          cal_event_uid,
          services (
            name,
            duration,
            price
          )
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      console.log('Initial appointments query result:', { data, error });

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }

      if (!data || data.length === 0) {
        console.log('No appointments found in the database');
        setAppointments([])
        return
      }

      // Transform the data to match our interface
      const transformedAppointments: Appointment[] = data.map(apt => {
        console.log('Processing appointment with services:', apt.services);
        const service = Array.isArray(apt.services) ? apt.services[0] : apt.services;
        return {
          id: apt.id,
          user_id: apt.user_id,
          service_id: apt.service_id,
          date: apt.date,
          time: apt.time,
          status: apt.status,
          cal_event_uid: apt.cal_event_uid,
          service: {
            name: service?.name || 'Unknown Service',
            duration: service?.duration || 0,
            price: service?.price || 0
          },
          user: {
            email: ''  // We'll fetch this separately
          }
        };
      });

      console.log('Transformed appointments:', transformedAppointments);

      // Get unique user IDs
      const userIds = Array.from(new Set(transformedAppointments.map(a => a.user_id)));
      console.log('Unique user IDs:', userIds);
      
      // Fetch user emails from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      console.log('Profiles query result:', { profiles, profilesError });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Get the current user's session to access their email
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Add user emails to appointments
      const finalAppointments = transformedAppointments.map(apt => {
        // If it's the current user's appointment, use their email
        const isCurrentUser = session?.user?.id === apt.user_id;
        const userEmail = isCurrentUser ? session?.user?.email : undefined;
        const profile = profiles?.find(p => p.id === apt.user_id);
        
        console.log('Processing final appointment:', {
          appointmentId: apt.id,
          foundUserEmail: userEmail,
          profile: profile
        });

        return {
          ...apt,
          user: {
            email: userEmail || 'Unknown User',
            full_name: profile?.full_name,
            phone: profile?.phone
          }
        };
      });

      console.log('Final appointments before deduplication:', finalAppointments);

      // Remove duplicates
      const uniqueAppointments = finalAppointments.filter((appointment, index, self) =>
        index === self.findIndex((a) => (
          a.date === appointment.date &&
          a.time === appointment.time &&
          a.service_id === appointment.service_id &&
          a.user_id === appointment.user_id
        ))
      );

      console.log('Final unique appointments:', uniqueAppointments);
      setAppointments(uniqueAppointments)
    } catch (error) {
      console.error('Error in fetchAppointments:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cancel appointment
  const handleCancelAppointment = async (appointmentId: number) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) {
        console.error('Error cancelling appointment:', error)
        return
      }

      // Refresh appointments
      await fetchAppointments()
    } catch (error) {
      console.error('Error in handleCancelAppointment:', error)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchAppointments()
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2">You must be an admin to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Appointments Management</h1>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No upcoming appointments found.</p>
        ) : (
          <>
            {/* Mobile view - Cards */}
            <div className="block sm:hidden space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="text-lg font-medium text-gray-900">{appointment.service.name}</div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      appointment.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : appointment.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500">
                    {appointment.service.duration} min - €{appointment.service.price}
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-sm font-medium text-gray-700">Date & Time</div>
                    <div className="text-sm text-gray-900">
                      {format(new Date(`${appointment.date}T00:00:00`), 'PPP')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.time.slice(0, 5)}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-sm font-medium text-gray-700">Client Details</div>
                    <div className="text-sm text-gray-900">{appointment.user.email}</div>
                    {appointment.user.full_name && (
                      <div className="text-sm text-gray-600">{appointment.user.full_name}</div>
                    )}
                    {appointment.user.phone && (
                      <div className="text-sm text-gray-500">{appointment.user.phone}</div>
                    )}
                  </div>

                  {appointment.status === 'confirmed' && (
                    <div className="border-t pt-3">
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium transition-colors"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop view - Table */}
            <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{appointment.user.email}</div>
                        {appointment.user.full_name && (
                          <div className="text-sm text-gray-600">{appointment.user.full_name}</div>
                        )}
                        {appointment.user.phone && (
                          <div className="text-sm text-gray-500">{appointment.user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{appointment.service.name}</div>
                        <div className="text-sm text-gray-500">
                          {appointment.service.duration} min - €{appointment.service.price}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {format(new Date(`${appointment.date}T00:00:00`), 'PPP')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.time.slice(0, 5)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          appointment.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 