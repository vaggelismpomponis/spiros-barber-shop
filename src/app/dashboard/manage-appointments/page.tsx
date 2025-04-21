'use client'

import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface Service {
  id: number
  name: string
  duration: number
  price: number
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
}

export default function ManageAppointmentsPage() {
  const supabase = createClientComponentClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<number | null>(null)

  // Fetch all appointments (not just user-specific ones)
  const fetchAppointments = async () => {
    try {
      console.log('Starting fetchAppointments...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }
      
      // Check if user is admin
      if (session?.user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        console.error('Unauthorized access attempt');
        toast.error('Unauthorized access');
        return;
      }

      const currentDate = new Date().toISOString().split('T')[0];
      console.log('Fetching appointments from date:', currentDate);

      // Get all appointments with service details and proper sorting
      const { data: appointments, error: appointmentsError } = await supabase
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
          service:services!inner (
            id,
            name,
            duration,
            price
          )
        `)
        .gte('date', currentDate)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      console.log('Raw appointments from DB:', appointments);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      // Transform and group appointments by date
      const transformedAppointments: Appointment[] = (appointments || []).map(apt => ({
        ...apt,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service
      }));

      // Group appointments by date
      const groupedAppointments = transformedAppointments.reduce((groups: { [key: string]: Appointment[] }, appointment) => {
        const date = appointment.date;
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(appointment);
        return groups;
      }, {});

      // Sort appointments within each date group by time
      Object.keys(groupedAppointments).forEach(date => {
        groupedAppointments[date].sort((a, b) => a.time.localeCompare(b.time));
      });

      console.log('Final grouped appointments:', groupedAppointments);
      setAppointments(transformedAppointments);
    } catch (error) {
      console.error('Error in fetchAppointments:', error);
      toast.error('Failed to load appointments. Please try again.');
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
          'apiKey': calApiKey
        };
        console.log('Full request details:', {
          url: '/api/bookings/cancel',
          method: 'POST',
          headers: { ...headers, apiKey: '[REDACTED]' },
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
          toast.error(responseData.error || 'Failed to cancel Cal.com booking. Please try again.');
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

      console.log('Updated appointment in database:', updatedAppointment);

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Manage Appointments</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">All Appointments</h2>
            <button
              onClick={() => fetchAppointments()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1A1A]"></div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">No appointments found</p>
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
                      className={`border-l-4 pl-4 py-3 ${
                        appointment.status === 'confirmed' 
                          ? 'border-green-500 bg-green-50' 
                          : appointment.status === 'completed'
                          ? 'border-blue-500 bg-blue-50'
                          : appointment.status === 'cancelled'
                          ? 'border-red-500 bg-red-50'
                          : 'border-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {appointment.service?.name || 'Unknown Service'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(`2000-01-01T${appointment.time}`), 'h:mm a')}
                          </p>
                          {appointment.service?.duration && (
                            <p className="text-xs text-gray-500 mt-1">
                              Duration: {appointment.service.duration} minutes
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full mb-2 ${
                            appointment.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                          
                          {/* Action buttons */}
                          {appointment.status === 'confirmed' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateAppointmentStatus(appointment.id, 'completed', appointment.cal_event_uid || null)}
                                disabled={updatingAppointmentId === appointment.id}
                                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(appointment.id, 'cancelled', appointment.cal_event_uid || null)}
                                disabled={updatingAppointmentId === appointment.id}
                                className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
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
                  Show {appointments.length - 10} More Appointments
                </button>
              )}
              {showAll && appointments.length > 10 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="w-full mt-4 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 