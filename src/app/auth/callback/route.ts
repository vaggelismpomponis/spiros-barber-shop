import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Add delay helper function to implement rate limiting relief
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Log full request URL and query parameters for debugging
  console.log('Auth callback URL:', request.url);
  console.log('Query parameters:', Object.fromEntries(requestUrl.searchParams.entries()));

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // Add a small delay to help with rate limiting
      await delay(300);
      
      console.log('Attempting to exchange code for session...');
      
      // Exchange the code for a session - this creates the session cookie
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
          details: JSON.stringify(error)
        });
        
        // Special handling for rate limit errors
        if (error.message && error.message.toLowerCase().includes('rate limit')) {
          // Add cache control headers to prevent browsers from retrying too quickly
          const response = NextResponse.redirect(new URL(`/auth/signin?error=rate-limit&message=${encodeURIComponent('Request rate limit reached. Please wait a few minutes before trying again.')}`, request.url));
          response.headers.set('Cache-Control', 'no-store, max-age=0');
          return response;
        }
        
        return NextResponse.redirect(new URL(`/auth/signin?error=exchange-error&message=${encodeURIComponent(error.message)}`, request.url))
      }
      
      console.log('Session exchange successful:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        userId: data.user?.id
      });
      
      if (!data.session) {
        console.error('No session returned from exchangeCodeForSession')
        return NextResponse.redirect(new URL('/auth/signin?error=no-session', request.url))
      }

      // We explicitly do NOT need to call getUser here - it will fail because the session
      // is still being established. Instead, use the user from the session data.
      if (!data.user) {
        console.error('No user returned in session data')
        return NextResponse.redirect(new URL('/auth/signin?error=no-user-data', request.url))
      }

      // Create profile if it doesn't exist
      console.log('Checking for existing profile for user:', data.user.id);
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('Error checking for existing profile:', profileCheckError)
      }

      if (!existingProfile) {
        console.log('Creating new profile for user:', data.user.id);
        // Create new profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Anonymous',
              phone: data.user.user_metadata?.phone || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])

        if (profileError) {
          console.error('Error creating profile:', profileError)
        } else {
          console.log('Profile created successfully');
        }
      } else {
        console.log('User profile already exists');
      }

      console.log('Auth flow completed successfully, redirecting to dashboard');
      // Redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
      
    } catch (err) {
      console.error('Unexpected error during auth callback:', err);
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      return NextResponse.redirect(new URL(`/auth/signin?error=unexpected&message=${encodeURIComponent(err instanceof Error ? err.message : 'Unknown error')}`, request.url))
    }
  } else {
    console.error('No code found in callback URL')
    return NextResponse.redirect(new URL('/auth/signin?error=no-code', request.url))
  }
} 