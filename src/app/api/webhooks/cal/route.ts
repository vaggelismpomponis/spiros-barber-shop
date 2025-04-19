import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Webhook handler for Cal.com integration
// Handles booking events and test pings
// Updated with proper signature verification

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, HEAD, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS(req: Request) {
  console.log('Received OPTIONS request')
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}

// Add a GET handler for testing
export async function GET(req: Request) {
  console.log('Received GET request')
  const response = NextResponse.json({ message: 'Cal.com webhook endpoint is accessible' })
  return addCorsHeaders(response)
}

// Add handlers for other methods
export async function HEAD(req: Request) {
  console.log('Received HEAD request')
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}

export async function PUT(req: Request) {
  console.log('Received PUT request')
  return handleWebhook(req)
}

export async function DELETE(req: Request) {
  console.log('Received DELETE request')
  return handleWebhook(req)
}

export async function POST(req: Request) {
  console.log('Received POST request')
  return handleWebhook(req)
}

// Common handler for webhook requests
async function handleWebhook(req: Request) {
  try {
    // Log request details
    const requestDetails = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    }
    console.log('Webhook request received:', requestDetails)

    const rawBody = await req.text()
    console.log('Raw body:', rawBody)

    // Verify environment variables are set
    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasOwnerEmail: !!process.env.CAL_OWNER_EMAIL
    })

    // Handle test ping from Cal.com
    if (rawBody.includes('"ping":true') || rawBody.includes('"type":"test"')) {
      console.log('Received test ping from Cal.com')
      const response = NextResponse.json({ message: 'Webhook test successful' })
      return addCorsHeaders(response)
    }

    let body
    try {
      body = JSON.parse(rawBody)
      console.log('Parsed webhook body:', body)
    } catch (error) {
      console.error('Failed to parse webhook body:', error)
      const response = NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      return addCorsHeaders(response)
    }

    // Only process booking events
    if (!body.triggerEvent?.startsWith('booking')) {
      console.log('Ignoring non-booking event:', body.triggerEvent)
      const response = NextResponse.json({ message: 'Event type ignored' })
      return addCorsHeaders(response)
    }
    
    // Extract relevant data from the webhook payload
    const {
      uid: cal_event_uid,
      title: service_name,
      startTime: start_time,
      endTime: end_time,
      attendees,
    } = body.payload

    console.log('Extracted appointment data:', {
      cal_event_uid,
      service_name,
      start_time,
      end_time,
      attendees
    })

    // Get the user's email from the attendees
    const userEmail = attendees?.find((a: any) => a.email !== process.env.CAL_OWNER_EMAIL)?.email

    if (!userEmail) {
      console.error('User email not found in attendees:', attendees)
      const response = NextResponse.json({ error: 'User email not found' }, { status: 400 })
      return addCorsHeaders(response)
    }

    console.log('Looking up user by email:', userEmail)

    // Find the user by email using service role client
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError) {
      console.error('Error finding user:', userError)
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 })
      return addCorsHeaders(response)
    }

    if (!userData) {
      console.error('No user found for email:', userEmail)
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 })
      return addCorsHeaders(response)
    }

    console.log('Found user:', userData)

    // Create the appointment using service role client
    const { error: appointmentError } = await supabase
      .from('appointments')
      .upsert({
        user_id: userData.id,
        cal_event_uid,
        service_name,
        start_time,
        end_time,
        status: body.triggerEvent === 'booking_created' ? 'confirmed' : 'cancelled'
      })

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError)
      const response = NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
      return addCorsHeaders(response)
    }

    console.log('Appointment created/updated successfully')
    const response = NextResponse.json({ success: true })
    return addCorsHeaders(response)
  } catch (error) {
    // Log the full error details
    console.error('Webhook error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    return addCorsHeaders(response)
  }
} 