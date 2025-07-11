import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // Capture session error for debugging
    if (error) {
      console.error('Error getting session in middleware:', error)
    }

    // If there's a session but it's expired, try to refresh it
    if (session?.expires_at && session.expires_at <= Math.floor(Date.now() / 1000)) {
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.error('Error refreshing session:', refreshError)
        
        // If refresh fails on protected routes, redirect to sign in
        if (req.nextUrl.pathname !== '/auth/signin' && 
            !req.nextUrl.pathname.startsWith('/auth/callback') && 
            !req.nextUrl.pathname.startsWith('/_next') &&
            !req.nextUrl.pathname.startsWith('/api')) {
          return NextResponse.redirect(new URL('/auth/signin', req.url))
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error in auth middleware:', err)
    
    // Don't redirect if on auth pages or static assets
    if (!req.nextUrl.pathname.startsWith('/auth/') && 
        !req.nextUrl.pathname.startsWith('/_next') && 
        !req.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
  }

  return res
}

// Specify which routes should trigger this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes (allow access to auth pages without session)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|auth).*)',
  ],
} 