import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const { data: { session }, error } = await supabase.auth.getSession()

  // If there's a session but it's expired, try to refresh it
  if (session?.expires_at && session.expires_at <= Math.floor(Date.now() / 1000)) {
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      // If refresh fails, redirect to sign in
      if (req.nextUrl.pathname !== '/auth/signin') {
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
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