'use client'

import React, { useEffect, useState } from 'react'
import { Header } from '../../components/Header'
import Cal, { getCalApi } from "@calcom/embed-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface Service {
  id: number
  name: string
  duration: number
  price: number
}

interface RawAppointment {
  id: number
  user_id: string
  service_id: number
  date: string
  time: string
  status: string
  service: Service | Service[]
}

interface Appointment {
  id: number
  user_id: string
  service_id: number
  date: string
  time: string
  status: string
  service: Service
}

export default function BookingPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

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
      console.log('Starting fetchAppointments...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }
      
      console.log('Session data:', {
        exists: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });
      
      if (!session?.user) {
        console.log('No active session found');
        setAppointments([]);
        return;
      }

      const currentDate = new Date().toISOString().split('T')[0];
      console.log('Fetching appointments from date:', currentDate);

      // Get appointments with service details
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          user_id,
          service_id,
          date,
          time,
          status,
          created_at,
          service:services!inner (
            id,
            name,
            duration,
            price
          )
        `)
        .eq('user_id', session.user.id)
        .not('status', 'eq', 'cancelled')
        .gte('date', currentDate)
        .order('created_at', { ascending: false }); // Sort by creation date, newest first

      console.log('Raw appointments from DB:', appointments);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      // Remove duplicates based on unique combination of date, time, and service
      const uniqueAppointments = (appointments as RawAppointment[] || []).reduce((acc: RawAppointment[], curr) => {
        const isDuplicate = acc.some(apt => 
          apt.date === curr.date && 
          apt.time === curr.time && 
          apt.service_id === curr.service_id
        );
        if (!isDuplicate) {
          acc.push(curr);
        } else {
          console.log('Found duplicate appointment:', curr);
        }
        return acc;
      }, []);

      // Transform the data to ensure service is a single object
      const transformedAppointments: Appointment[] = uniqueAppointments.map(apt => ({
        ...apt,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service
      }));

      console.log('Final transformed appointments:', transformedAppointments);
      setAppointments(transformedAppointments);
    } catch (error) {
      console.error('Error in fetchAppointments:', error);
      toast.error('Failed to load your appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Single useEffect for initial fetch
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Debugging appointments state changes
  useEffect(() => {
    console.log('Appointments state updated:', {
      count: appointments.length,
      appointments: appointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        service: apt.service.name
      }))
    });
  }, [appointments]);

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
              console.log('Looking for service with name:', serviceName);

              // First, get all services to see what we're working with
              const { data: allServices, error: servicesError } = await supabase
                .from('services')
                .select('id, name, category');

              console.log('Available services:', allServices);
              
              if (servicesError) {
                console.error('Error fetching services:', servicesError);
                throw new Error(`Error fetching services: ${servicesError.message}`);
              }

              // Helper function to normalize strings for comparison
              const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

              // Find the best matching service
              let service = allServices?.find(s => {
                const normalizedServiceName = normalizeString(serviceName);
                const normalizedDbName = normalizeString(s.name);
                
                // Try exact match first
                if (normalizedDbName === normalizedServiceName) {
                  return true;
                }

                // If service name contains 'haircut', match with any haircut category service
                if (normalizedServiceName.includes('haircut') && s.category === 'haircut') {
                  return true;
                }

                // Check if the normalized names have significant overlap
                return normalizedServiceName.includes(normalizedDbName) ||
                       normalizedDbName.includes(normalizedServiceName);
              });

              if (!service) {
                console.error('No matching service found. Available services:', 
                  allServices?.map(s => ({name: s.name, category: s.category}))
                );
                // Default to Classic Haircut if no match found
                const defaultService = allServices?.find(s => s.name === 'Classic Haircut');
                if (!defaultService) {
                  throw new Error(`No matching service found for: ${serviceName} and no default service available`);
                }
                console.log('Using default service:', defaultService);
                service = defaultService;
              }

              console.log('Found matching service:', service);

              // Get start time from the booking object
              const startTime = booking.startTime || booking.start_time;

              if (!startTime) {
                throw new Error(`Invalid booking time - Start: ${startTime}. Full booking data: ${JSON.stringify(booking, null, 2)}`);
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

              // Parse the start date
              const startDate = parseDateSafely(startTime);

              // Format date and time separately
              const appointmentDate = format(startDate, 'yyyy-MM-dd');
              const appointmentTime = format(startDate, 'HH:mm:ss');

              // Generate a unique event ID if not provided
              const calEventUid = booking.uid || booking.id || crypto.randomUUID();

              // Prepare appointment data with correct types
              const appointmentData = {
                user_id: user.id,
                service_id: service.id,
                date: appointmentDate,
                time: appointmentTime,
                cal_event_uid: calEventUid,
                status: 'confirmed'
              };

              console.log('Attempting to save appointment with data:', appointmentData);

              try {
                // Check if appointment already exists
                const { data: existingAppointment, error: checkError } = await supabase
                  .from('appointments')
                  .select()
                  .eq('user_id', user.id)
                  .eq('date', appointmentDate)
                  .eq('time', appointmentTime)
                  .eq('service_id', service.id)
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

                console.log('Successfully saved appointment:', appointment);
                // Refresh appointments immediately
                await fetchAppointments();
                
                // Redirect to bookings page after successful booking
                router.push('/bookings');
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
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1A1A]"></div>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No upcoming appointments</p>
                  <p className="text-sm text-gray-400 mt-2">Use the calendar to schedule your visit</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(showAll ? appointments : appointments.slice(0, 4)).map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className={`border-l-4 pl-4 py-3 ${
                        appointment.status === 'confirmed' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-gray-900">
                          {appointment.service?.name || 'Unknown Service'}
                        </p>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          appointment.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(new Date(`${appointment.date}T${appointment.time}`), 'PPP')}
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
                  ))}
                  {!showAll && appointments.length > 4 && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full mt-4 py-2 px-4 bg-[#1A1A1A] text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      Show {appointments.length - 4} More Appointments
                    </button>
                  )}
                  {showAll && appointments.length > 4 && (
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