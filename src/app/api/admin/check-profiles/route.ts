import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // First, verify that the requester is an admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (adminError || !adminData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      return NextResponse.json({ error: 'Error fetching profiles', details: profilesError }, { status: 500 })
    }

    // Get all appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('user_id')

    if (appointmentsError) {
      return NextResponse.json({ error: 'Error fetching appointments', details: appointmentsError }, { status: 500 })
    }

    // Get unique user IDs from appointments
    const appointmentUserIds = Array.from(new Set(appointments.map(apt => apt.user_id)))

    // Check which appointment user IDs don't have profiles
    const missingProfiles = appointmentUserIds.filter(
      userId => !profiles.some(profile => profile.id === userId)
    )

    return NextResponse.json({
      total_profiles: profiles.length,
      profiles: profiles,
      total_unique_appointment_users: appointmentUserIds.length,
      appointment_user_ids: appointmentUserIds,
      missing_profiles: missingProfiles
    })
  } catch (error) {
    console.error('Error in check-profiles:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 