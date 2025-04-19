import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function verifyCalSignature(payload: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) {
    console.log('Missing signature or secret:', { hasSignature: !!signature, hasSecret: !!secret })
    return process.env.NODE_ENV === 'development'
  }
  
  try {
    const hmac = crypto.createHmac('sha256', secret)
    const computedSignature = hmac.update(payload).digest('hex')
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    )
    console.log('Signature verification:', { isValid, signature, computedSignature })
    return isValid
  } catch (error) {
    console.error('Error verifying signature:', error)
    return process.env.NODE_ENV === 'development'
  }
}

// Add a GET handler for testing
export async function GET(req: Request) {
  return NextResponse.json({ message: 'Cal.com webhook endpoint is accessible' })
}

export async function POST(req: Request) {
  try {
    console.log('Webhook request received:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    })

    const rawBody = await req.text()
    console.log('Raw body:', rawBody)

    // Handle test ping from Cal.com
    if (rawBody.includes('"ping":true') || rawBody.includes('"type":"test"')) {
      console.log('Received test ping from Cal.com')
      return NextResponse.json({ message: 'Webhook test successful' })
    }

    const signature = req.headers.get('cal-signature')
    
    // Verify Cal.com webhook signature
    const isValid = verifyCalSignature(
      rawBody,
      signature,
      process.env.CAL_WEBHOOK_SECRET
    )

    if (!isValid && process.env.NODE_ENV !== 'development') {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    let body
    try {
      body = JSON.parse(rawBody)
    } catch (error) {
      console.error('Failed to parse webhook body:', error)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    console.log('Webhook event type:', body.triggerEvent)
    
    // Only process booking events
    if (!body.triggerEvent?.startsWith('booking')) {
      return NextResponse.json({ message: 'Event type ignored' })
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
      console.error('User email not found in attendees')
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies })

    // Find the user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError) {
      console.error('Error finding user:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!userData) {
      console.error('No user found for email:', userEmail)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('Found user:', userData)

    // Create the appointment
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
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    console.log('Appointment created/updated successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 