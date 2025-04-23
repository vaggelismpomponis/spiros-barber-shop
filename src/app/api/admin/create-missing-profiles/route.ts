import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
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

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')

    if (profilesError) {
      return NextResponse.json({ error: 'Error fetching profiles', details: profilesError }, { status: 500 })
    }

    // Get all appointments
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('user_id')

    if (appointmentsError) {
      return NextResponse.json({ error: 'Error fetching appointments', details: appointmentsError }, { status: 500 })
    }

    // Get unique user IDs from appointments
    const appointmentUserIds = Array.from(new Set(appointments.map(apt => apt.user_id)))

    // Find user IDs that don't have profiles
    const existingProfileIds = new Set(profiles.map(p => p.id))
    const missingUserIds = appointmentUserIds.filter(id => !existingProfileIds.has(id))

    if (missingUserIds.length === 0) {
      return NextResponse.json({
        message: 'No missing profiles found',
        created: 0,
        profiles: []
      })
    }

    // Create profiles for missing users using the admin client to bypass RLS
    const createdProfiles = []
    for (const userId of missingUserIds) {
      const { data, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: userId,
            full_name: 'Guest User',
            phone: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()

      if (insertError) {
        console.error('Error creating profile for user', userId, ':', insertError)
      } else if (data) {
        createdProfiles.push(data[0])
      }
    }

    return NextResponse.json({
      message: 'Profiles created successfully',
      created: createdProfiles.length,
      profiles: createdProfiles
    })
  } catch (error) {
    console.error('Error in create-missing-profiles:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 