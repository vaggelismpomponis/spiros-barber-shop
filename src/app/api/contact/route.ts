import { Resend } from 'resend'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateRequired(value: string, field: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${field} is required`
  }
  return null
}

export async function POST(req: Request) {
  try {
    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = body

    // Validate inputs
    const errors: Record<string, string> = {}
    
    const nameError = validateRequired(name, 'Name')
    if (nameError) errors.name = nameError
    
    const emailError = validateRequired(email, 'Email')
    if (emailError) {
      errors.email = emailError
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email format'
    }
    
    const subjectError = validateRequired(subject, 'Subject')
    if (subjectError) errors.subject = subjectError
    
    const messageError = validateRequired(message, 'Message')
    if (messageError) errors.message = messageError

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', fields: errors },
        { status: 400 }
      )
    }

    // Store in database
    const supabase = createRouteHandlerClient({ cookies })
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert([{ name, email, subject, message }])

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save message to database' },
        { status: 500 }
      )
    }

    // Send email notification
    if (resend) {
      try {
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
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        // Return success since we saved to database, but log the email error
        return NextResponse.json({
          message: 'Message saved but email notification failed',
          warning: 'Admin notification email could not be sent'
        })
      }
    } else {
      // No API key, skip email sending
      return NextResponse.json({
        message: 'Message saved but email notification skipped',
        warning: 'No RESEND_API_KEY set, admin notification email not sent.'
      })
    }

    return NextResponse.json({ message: 'Message sent successfully' })
  } catch (error) {
    console.error('Unexpected error processing contact form:', error)
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your message' },
      { status: 500 }
    )
  }
} 