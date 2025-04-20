'use client'

import React, { useEffect, useState } from 'react'
import { Header } from '../../components/Header'
import Cal, { getCalApi } from "@calcom/embed-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface Appointment {
  id: string
  user_id: string
  cal_event_uid: string
  service_name: string
  start_time: string
  end_time: string
  status: string
  created_at: string
  updated_at?: string  // Made optional since it might be set by the database
}

export default function BookingPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // Function to inspect table structure
  const inspectTableStructure = async () => {
    try {
      // First try to get a single row to understand the structure
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .limit(1)
        .single();
      
      console.log('Table inspection results:', {
        columnNames: data ? Object.keys(data) : [],
        sampleRow: data,
        error: error
      });

      // Also try to get the table definition
      const { data: definition, error: defError } = await supabase
        .from('appointments')
        .select()
        .limit(0);

      console.log('Table definition:', {
        definition,
        error: defError
      });
    } catch (error) {
      console.error('Error in table inspection:', error);
    }
  };

  // Call inspection on component mount
  useEffect(() => {
    inspectTableStructure();
  }, []);

  // Fetch user's appointments
  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user)
      
      if (user) {
        // First get all appointments
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true });

        console.log('Fetched appointments:', data)
        console.log('Fetch error:', error)

        if (error) {
          console.error('Error fetching appointments:', error)
        } else {
          // Remove duplicates based on cal_event_uid
          const uniqueAppointments = data ? 
            data.filter((appointment, index, self) =>
              index === self.findIndex((a) => a.cal_event_uid === appointment.cal_event_uid)
            ) : [];
          
          setAppointments(uniqueAppointments)
        }
      }
    } catch (error) {
      console.error('Error in fetchAppointments:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAppointments()
  }, [])

  useEffect(() => {
    (async function () {
      const cal = await getCalApi()
      // Configure the Cal.com embed
      cal("ui", {
        styles: { branding: { brandColor: "#000000" } },
        layout: "month_view"
      })

      // Handle booking success
      cal("on", {
        action: "bookingSuccessful",
        callback: async (e: any) => {
          try {
            console.log('Booking event:', e.detail)
            // Save the booking to Supabase
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user && e.detail.data) {
              const bookingData = e.detail.data
              console.log('Processing booking:', bookingData)

              // Extract the actual booking details from the nested structure
              const booking = bookingData.booking || bookingData;
              console.log('Extracted booking details:', booking);

              // Extract service name from the booking data
              const serviceName = booking.eventType?.title || 'Haircut Service'

              // Get start and end times from the booking object
              const startTime = booking.startTime || booking.start_time;
              const endTime = booking.endTime || booking.end_time;

              console.log('Processing times:', { startTime, endTime });

              if (!startTime || !endTime) {
                throw new Error(`Invalid booking times - Start: ${startTime}, End: ${endTime}. Full booking data: ${JSON.stringify(booking, null, 2)}`);
              }

              // Function to safely parse date with multiple fallback methods
              const parseDateSafely = (dateInput: any): Date => {
                if (!dateInput) {
                  throw new Error('Date input is null or undefined');
                }

                // If it's already a Date object
                if (dateInput instanceof Date) {
                  if (isNaN(dateInput.getTime())) {
                    throw new Error('Invalid Date object');
                  }
                  return dateInput;
                }

                // If it's a string, try parsing
                if (typeof dateInput === 'string') {
                  const date = new Date(dateInput);
                  if (!isNaN(date.getTime())) {
                    return date;
                  }
                  throw new Error(`Invalid date string: ${dateInput}`);
                }

                // If it's a number (timestamp)
                if (typeof dateInput === 'number') {
                  const date = new Date(dateInput);
                  if (!isNaN(date.getTime())) {
                    return date;
                  }
                  throw new Error(`Invalid timestamp: ${dateInput}`);
                }

                throw new Error(`Unsupported date input type: ${typeof dateInput}`);
              };

              // Try parsing both dates
              const startDate = parseDateSafely(startTime);
              const endDate = parseDateSafely(endTime);

              // Convert to ISO strings
              const startTimeISO = startDate.toISOString();
              const endTimeISO = endDate.toISOString();

              console.log('Parsed dates:', {
                startTimeISO,
                endTimeISO,
                startDate: startDate.toString(),
                endDate: endDate.toString()
              });

              // Generate a unique event ID if not provided
              const calEventUid = booking.uid || booking.id || crypto.randomUUID()

              // Prepare appointment data with correct types
              const appointmentData = {
                user_id: user.id,
                service_name: serviceName,
                cal_event_uid: calEventUid,
                start_time: startTimeISO,
                end_time: endTimeISO,
                status: 'confirmed',
                created_at: new Date().toISOString()
              }

              console.log('Attempting to save appointment with data:', {
                appointmentData,
                validation: {
                  hasUserId: !!appointmentData.user_id,
                  userIdFormat: typeof appointmentData.user_id,
                  hasStartTime: !!appointmentData.start_time,
                  hasEndTime: !!appointmentData.end_time,
                  startTimeFormat: typeof appointmentData.start_time,
                  endTimeFormat: typeof appointmentData.end_time,
                  status: appointmentData.status
                }
              });

              try {
                // Check if appointment already exists
                const { data: existingAppointment, error: checkError } = await supabase
                  .from('appointments')
                  .select()
                  .eq('user_id', user.id)
                  .eq('cal_event_uid', calEventUid)
                  .single();

                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
                  console.error('Error checking for existing appointment:', checkError);
                  throw checkError;
                }

                if (existingAppointment) {
                  console.log('Appointment already exists:', existingAppointment);
                  // Skip saving and just refresh the view
                  await fetchAppointments();
                  router.push('/dashboard?tab=appointments');
                  return;
                }

                // Save new appointment if it doesn't exist
                const { data: appointment, error: appointmentError } = await supabase
                  .from('appointments')
                  .insert([appointmentData])
                  .select();

                if (appointmentError) {
                  console.error('Error saving appointment:', {
                    error: appointmentError,
                    code: appointmentError.code,
                    message: appointmentError.message,
                    details: appointmentError.details,
                    hint: appointmentError.hint
                  });
                  throw appointmentError;
                }

                console.log('Successfully saved appointment:', appointment)
                // Refresh appointments immediately
                await fetchAppointments()
                
                // Redirect to dashboard after successful booking
                router.push('/dashboard?tab=appointments')
              } catch (error) {
                console.error('Detailed appointment save error:', {
                  error,
                  appointmentData,
                  userInfo: {
                    id: user.id,
                    email: user.email
                  }
                });
                throw error;
              }
            }
          } catch (error) {
            console.error('Error processing booking:', error)
            if (error instanceof Error) {
              console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
              })
            }
            console.log('Full booking data:', e.detail)
          }
        }
      })
    })()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Book Your Appointment</h1>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Current Appointments Section */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Your Upcoming Appointments</h2>
              {loading ? (
                <p className="text-gray-500">Loading appointments...</p>
              ) : appointments.length === 0 ? (
                <p className="text-gray-500">No upcoming appointments</p>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border-l-4 border-black pl-4 py-2">
                      <p className="font-medium">{appointment.service_name}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(appointment.start_time), 'PPP')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(appointment.start_time), 'p')} - {format(new Date(appointment.end_time), 'p')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking Calendar Section */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative w-full md:h-[calc(90vh-200px)] h-screen" style={{
                minHeight: '600px',
                maxHeight: '800px'
              }}>
                <Cal 
                  calLink="spiros-barber-shop"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    msOverflowStyle: '-ms-autohiding-scrollbar'
                  }}
                  config={{
                    theme: 'light',
                    layout: "month_view"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 