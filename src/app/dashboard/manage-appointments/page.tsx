'use client'

import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { el } from 'date-fns/locale'

interface Service {
  id: number
  name: string
  duration: number
  price: number
}

interface User {
  id: string
  full_name: string | null
  phone: string | null
}

interface Appointment {
  id: number
  user_id: string
  service_id: number
  date: string
  time: string
  status: string
  service: Service
  cal_event_uid?: string
  user: User
}

// Admin protection wrapper component
const AdminProtected = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClientComponentClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Πρέπει να είστε συνδεδεμένοι για να αποκτήσετε πρόσβαση σε αυτή τη σελίδα')
          return
        }

        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('email', session.user.email)
          .single()

        if (adminError || !adminData) {
          setError('Δεν έχετε άδεια πρόσβασης σε αυτήν τη σελίδα')
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setError('An error occurred while checking permissions')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A1A1A]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-lg max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Δεν επιτρέπεται η πρόσβαση</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}

export default function ManageAppointmentsPage() {
  const supabase = createClientComponentClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Debug function to check admins table
  const checkAdminsTable = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current user session:', {
        email: session?.user?.email,
        id: session?.user?.id
      });

      const { data: admins, error } = await supabase
        .from('admins')
        .select('*');

      console.log('Admins table contents:', {
        admins,
        error,
        count: admins?.length || 0
      });

      // Check specific admin
      if (session?.user?.email) {
        const { data: specificAdmin, error: specificError } = await supabase
          .from('admins')
          .select('*')
          .eq('email', session.user.email)
          .single();

        console.log('Specific admin check:', {
          email: session.user.email,
          admin: specificAdmin,
          error: specificError
        });
      }
    } catch (error) {
      console.error('Error checking admins table:', error);
    }
  };

  // Call the check function on mount
  useEffect(() => {
    checkAdminsTable();
  }, []);

  // Fetch all appointments (not just user-specific ones)
  const fetchAppointments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        return;
      }

      // Add debug check here
      await checkAdminsTable();

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('email', session?.user?.email)
        .single();

      if (adminError || !adminData) {
        console.error('Admin check error:', adminError);
        setError('Unauthorized access');
        return;
      }

      // Fix date handling
      const today = new Date();
      const currentDate = today.toISOString().split('T')[0];
      console.log('Fetching appointments from date:', currentDate);

      // Get all appointments with service details and proper sorting
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          user_id,
          service_id,
          date,
          time,
          status,
          cal_event_uid,
          created_at,
          service:services (
            id,
            name,
            duration,
            price
          )
        `)
        .filter('date', 'gte', currentDate)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        setError('Error fetching appointments');
        return;
      }

      if (appointmentsData) {
        console.log('Raw appointments:', JSON.stringify(appointmentsData, null, 2));

        // Get unique user IDs from appointments
        const userIds = Array.from(new Set(appointmentsData.map(apt => apt.user_id)));
        console.log('Unique user IDs:', userIds);

        // Fetch user profiles
        const { data: userProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError);
          setError('Error fetching user profiles');
          return;
        }

        console.log('Fetched user profiles:', JSON.stringify(userProfiles, null, 2));

        // Map appointments with user and service data
        const appointmentsWithData = appointmentsData.map(appointment => {
          const user = userProfiles?.find(u => u.id === appointment.user_id);
          console.log(`Processing appointment ${appointment.id}:`, {
            appointment_id: appointment.id,
            user_id: appointment.user_id,
            found_user: user || 'Not found',
            all_profiles: userProfiles?.map(p => ({ id: p.id, name: p.full_name }))
          });

          // If no user profile found, let's check why
          if (!user) {
            console.warn(`No profile found for user ${appointment.user_id}. Available profile IDs:`, 
              userProfiles?.map(p => p.id)
            );
          }

          return {
            ...appointment,
            user: user || {
              id: appointment.user_id,
              full_name: null,
              phone: null
            },
            service: Array.isArray(appointment.service) 
              ? appointment.service[0] 
              : appointment.service
          } as Appointment;
        });

        console.log('Final transformed appointments:', JSON.stringify(appointmentsWithData.map(apt => ({
          id: apt.id,
          user_id: apt.user_id,
          user: apt.user,
          service: apt.service
        })), null, 2));

        setAppointments(appointmentsWithData);
      } else {
        console.log('No appointments found');
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error in fetchAppointments:', error);
      setError('Error fetching appointments data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Function to update appointment status
  const updateAppointmentStatus = async (appointmentId: number, newStatus: string, calEventUid: string | null) => {
    try {
      setUpdatingAppointmentId(appointmentId);
      const calApiKey = process.env.NEXT_PUBLIC_CAL_API_KEY;
      
      if (newStatus === 'cancelled' && calEventUid) {
        console.log('Cal API Key:', calApiKey);
        console.log('Cal Event UID:', calEventUid);
        
        if (!calApiKey) {
          toast.error('Cal.com API key not found. Please check your environment variables.');
          return;
        }

        // First, cancel the booking in Cal.com through our API route
        const headers = {
          'Content-Type': 'application/json',
          'apikey': calApiKey
        };
        console.log('Full request details:', {
          url: '/api/bookings/cancel',
          method: 'POST',
          headers: { ...headers, apikey: '[REDACTED]' },
          body: { calEventUid }
        });

        const cancelResponse = await fetch('/api/bookings/cancel', {
          method: 'POST',
          headers,
          body: JSON.stringify({ calEventUid })
        });

        console.log('Cancel response status:', cancelResponse.status);
        const responseData = await cancelResponse.json();
        console.log('Cancel response data:', responseData);

        if (!cancelResponse.ok) {
          console.error('Failed to cancel Cal.com booking:', responseData);
          toast.error(responseData.error || 'Η ακύρωση της κράτησης Cal.com απέτυχε. Δοκιμάστε ξανά.');
          return;
        }
      }

      // Update appointment in our database
      const { data: updatedAppointment, error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Ενημερωμένο ραντεβού στη βάση δεδομένων:', updatedAppointment);

      // Show success message
      toast.success(`Appointment ${newStatus} successfully`);
      
      // Refresh appointments list
      await fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment status');
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  // Add this function after the existing imports
  const exportToExcel = (appointments: Appointment[]) => {
    // Format the data for Excel
    const formattedData = appointments.map(apt => ({
      'Ημερομηνία': format(new Date(apt.date), 'dd/MM/yyyy', { locale: el }),
      'Ώρα': format(new Date(`2000-01-01T${apt.time}`), 'HH:mm', { locale: el }),
      'Υπηρεσία': apt.service?.name || 'Άγνωστη Υπηρεσία',
      'Πελάτης': apt.user?.full_name || 'Άγνωστος',
      'Τηλέφωνο': apt.user?.phone || 'Δεν βρέθηκε'
    }));

    // Convert to CSV format
    const headers = Object.keys(formattedData[0]);
    const csvContent = [
      headers.join(','),
      ...formattedData.map(row => 
        headers.map(header => 
          JSON.stringify(row[header as keyof typeof row] || '')
        ).join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `appointments-${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminProtected>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Διαχείριση ραντεβού
        </h1>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAll(!showAll)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full sm:w-auto"
              >
                {showAll ? 'Εμφάνιση μόνο ενεργών' : 'Εμφάνιση Όλων'}
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-6">
                <h2 className="text-xl font-semibold">Όλα τα ραντεβού</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => exportToExcel(appointments)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-full sm:w-auto"
                  >
                    Εξαγωγή σε Excel
                  </button>
                  <button
                    onClick={() => fetchAppointments()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors w-full sm:w-auto"
                  >
                    Ανανέωση
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1A1A]"></div>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">Δεν βρέθηκαν ραντεβού</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    (showAll ? appointments : appointments.slice(0, 10)).reduce((groups: { [key: string]: Appointment[] }, appointment) => {
                      const date = appointment.date;
                      if (!groups[date]) {
                        groups[date] = [];
                      }
                      groups[date].push(appointment);
                      return groups;
                    }, {})
                  ).map(([date, dateAppointments]) => (
                    <div key={date} className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                      </h3>
                      {dateAppointments
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((appointment) => (
                          <div 
                            key={appointment.id} 
                            className="border-l-4 pl-4 py-3 border-green-500 bg-green-50 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 break-words">
                                {appointment.service?.name || 'Άγνωστη Υπηρεσία'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(`2000-01-01T${appointment.time}`), 'h:mm a')}
                              </p>
                              {appointment.service?.duration && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Διάρκεια: {appointment.service.duration} λεπτά
                                </p>
                              )}
                              <div className="mt-2 space-y-1">
                                <p className="text-sm font-medium text-gray-700">
                                  Πελάτης: {appointment.user?.full_name || 'Άγνωστος'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Τηλέφωνο: {appointment.user?.phone || 'Δεν βρέθηκε'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                  
                  {!showAll && appointments.length > 10 && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full mt-4 py-2 px-4 bg-[#1A1A1A] text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      Εμφάνισε {appointments.length - 10} Περισσότερα Ραντεβού
                    </button>
                  )}
                  {showAll && appointments.length > 10 && (
                    <button
                      onClick={() => setShowAll(false)}
                      className="w-full mt-4 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Εμφάνισε Λιγότερα Ραντεβού
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminProtected>
  );
} 