'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FcGoogle } from 'react-icons/fc'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import TurnstileWidget from '@/components/TurnstileWidget'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      const messageParam = params.get('message');
      
      if (errorParam) {
        if (messageParam && messageParam.includes('rate limit')) {
          setError('Έχετε κάνει πάρα πολλές προσπάθειες σύνδεσης. Παρακαλώ περιμένετε λίγα λεπτά και δοκιμάστε ξανά.');
        } else {
          setError(`${errorParam}${messageParam ? ': ' + messageParam : ''}`);
        }
      }
    }
  }, []);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const isRateLimited = useCallback(() => {
    return error?.toLowerCase().includes('rate limit');
  }, [error]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!turnstileToken) {
        throw new Error('Please complete the Turnstile verification')
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: turnstileToken
        }
      })

      if (error) throw error

      // If remember me is checked, set session expiry to 7 days, otherwise 1 day
      if (rememberMe) {
        await supabase.auth.updateUser({
          data: { rememberMe: true }
        })
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      if (isRateLimited()) {
        return;
      }
      
      setLoading(true)
      setError(null)
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Starting Google sign-in process...');
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false
        }
      });
      
      if (error) {
        console.error('Google sign-in error:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }
      
      console.log('Google auth started successfully:', {
        url: data?.url,
        provider: data?.provider,
        hasUrl: !!data?.url
      });
      
      // The page will automatically redirect to Google at this point
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      setError(error instanceof Error ? error.message : 'An error occurred during Google sign-in');
      setLoading(false);
    }
  };

  const handleDebugAuth = async () => {
    try {
      setDebugLoading(true);
      const response = await fetch('/api/debug-auth');
      const data = await response.json();
      setDebugInfo(data);
    } catch (err) {
      console.error('Error debugging auth:', err);
      setError('Debug failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
          Σύνδεση στον λογαριασμό σας
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ή{' '}
          <Link href="/auth/signup" className="font-medium text-[#1A1A1A] hover:text-gray-800">
            δημιουργήστε έναν νέο λογαριασμό
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleEmailSignIn}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Διεύθυνση E-Mail
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A1A1A] focus:border-[#1A1A1A] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Κωδικός Πρόσβασης
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A1A1A] focus:border-[#1A1A1A] sm:text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <AiOutlineEyeInvisible className="h-5 w-5 text-gray-400" />
                  ) : (
                    <AiOutlineEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#1A1A1A] focus:ring-[#1A1A1A] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Θυμήσου με
                  </label>
                </div>
                <div className="text-sm">
                  <Link
                    href="/auth/reset-password"
                    className="font-medium text-black hover:text-gray-800"
                  >
                    Ξέχασες τον κωδικό σου;
                  </Link>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <TurnstileWidget onSuccess={handleTurnstileSuccess} />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !turnstileToken || isRateLimited()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1A1A1A] hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Σύνδεση...' : isRateLimited() ? 'Παρακαλώ περιμένετε...' : 'Σύνδεση'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ή</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || isRateLimited()}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FcGoogle className="h-5 w-5" />
                {loading ? 'Σύνδεση...' : isRateLimited() ? 'Παρακαλώ περιμένετε...' : 'Σύνδεση με Google'}
              </button>
            </div>
          </div>
          
          {/* Display error from URL parameters */}
          {typeof window !== 'undefined' && window.location.search && new URLSearchParams(window.location.search).get('error') && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Error: {new URLSearchParams(window.location.search).get('error')}
                {new URLSearchParams(window.location.search).get('message') && (
                  <span className="block mt-1">
                    {new URLSearchParams(window.location.search).get('message')}
                  </span>
                )}
              </p>
            </div>
          )}
          
          {/* Debug section */}
          <div className="mt-6 border-t pt-4">
            <button
              onClick={handleDebugAuth}
              disabled={debugLoading}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              {debugLoading ? 'Checking...' : 'Debug Auth Status'}
            </button>
            
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono overflow-auto max-h-48">
                <div className="mb-2">
                  <strong>Session:</strong> {debugInfo.session.exists ? 'Active' : 'Not found'}
                  {debugInfo.session.error && (
                    <span className="text-red-600 block">
                      Error: {debugInfo.session.error.message}
                    </span>
                  )}
                </div>
                
                <div className="mb-2">
                  <strong>User:</strong> {debugInfo.user.exists ? `${debugInfo.user.email} (${debugInfo.user.id})` : 'Not found'}
                  {debugInfo.user.error && (
                    <span className="text-red-600 block">
                      Error: {debugInfo.user.error.message}
                    </span>
                  )}
                </div>
                
                <div>
                  <strong>Cookies:</strong> {debugInfo.cookies.count} found
                  <div>Auth cookie present: {debugInfo.cookies.hasSbAuthCookie ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 