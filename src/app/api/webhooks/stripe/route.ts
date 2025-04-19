import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Initialize Supabase client
      const supabase = createRouteHandlerClient({ cookies })

      // Get the appointment details from the metadata
      const metadata = session.metadata
      if (!metadata) {
        throw new Error('No metadata found in session')
      }

      const {
        serviceId,
        serviceName,
        startTime,
        endTime,
        userId,
      } = metadata

      // Create the appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: userId,
          service_id: serviceId,
          service_name: serviceName,
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed',
          payment_status: 'paid',
          stripe_session_id: session.id,
          amount_paid: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents to dollars
        })

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError)
        return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
      }

      // You might want to send a confirmation email here
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 