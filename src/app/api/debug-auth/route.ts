import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Try to get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    // Try to get user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    // Get all cookies for debugging
    const allCookies = cookieStore.getAll().map(cookie => ({
      name: cookie.name,
      value: cookie.name.includes('supabase') ? '[REDACTED]' : cookie.value,
    }))
    
    return NextResponse.json({
      session: {
        exists: !!sessionData?.session,
        error: sessionError ? {
          message: sessionError.message,
          status: sessionError.status,
        } : null,
      },
      user: {
        exists: !!userData?.user,
        id: userData?.user?.id,
        email: userData?.user?.email,
        error: userError ? {
          message: userError.message,
          status: userError.status,
        } : null,
      },
      cookies: {
        count: allCookies.length,
        hasSbAuthCookie: allCookies.some(c => c.name.includes('sb-auth')),
        hasAccessTokenCookie: allCookies.some(c => c.name.includes('access_token')),
        cookieList: allCookies
      }
    })
  } catch (error) {
    console.error('Error in debug-auth route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 