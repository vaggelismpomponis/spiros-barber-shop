import { Resend } from 'resend'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = body

    // Store in database
    const supabase = createRouteHandlerClient({ cookies })
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert([{ name, email, subject, message }])

    if (dbError) throw dbError

    // Send email notification
    await resend.emails.send({
      from: 'Spiros Barber Shop <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL!,
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    })

    return NextResponse.json({ message: 'Message sent successfully' })
  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
} 