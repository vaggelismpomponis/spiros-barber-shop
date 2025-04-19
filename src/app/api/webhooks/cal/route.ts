import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function verifyCalSignature(payload: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false
  
  const hmac = crypto.createHmac('sha256', secret)
  const computedSignature = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  )
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('X-Cal-Signature-256')
    
    // Verify Cal.com webhook signature
    const isValid = verifyCalSignature(
      rawBody,
      signature,
      process.env.CAL_WEBHOOK_SECRET
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const body = JSON.parse(rawBody)
    
    // Extract relevant data from the webhook payload
    const {
      uid: cal_event_uid,
      title: service_name,
      startTime: start_time,
      endTime: end_time,
      attendees,
    } = body.payload

    // Get the user's email from the attendees
    const userEmail = attendees.find((a: any) => a.email !== process.env.CAL_OWNER_EMAIL)?.email

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies })

    // Find the user by email
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create the appointment
    const { error: appointmentError } = await supabase
      .from('appointments')
      .upsert({
        user_id: userData.id,
        cal_event_uid,
        service_name,
        start_time,
        end_time,
        status: 'confirmed',
      })

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError)
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 