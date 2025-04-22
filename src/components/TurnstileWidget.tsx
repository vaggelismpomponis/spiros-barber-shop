'use client'

import { useCallback, useEffect, useState } from 'react'
import Turnstile from 'react-turnstile'

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void
}

export default function TurnstileWidget({ onSuccess }: TurnstileWidgetProps) {
  const [siteKey, setSiteKey] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    // Get the site key from environment variable
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!key) {
      setError('Turnstile site key is not configured')
      return
    }
    setSiteKey(key)

    // Collect debug information
    const debug = {
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      fullUrl: window.location.href,
      siteKey: key
    }

    console.log('Turnstile Debug Info:', debug)
    setDebugInfo(JSON.stringify(debug, null, 2))
  }, [])

  const handleError = useCallback((errorCode: string) => {
    console.error('Turnstile error:', errorCode)
    let errorMessage = 'Verification failed. Please try again.'
    
    // Add specific error messages
    switch (errorCode) {
      case '110200':
        errorMessage = `Domain validation error. Your current domain (${window.location.host}) is not authorized. Please add it to Cloudflare Turnstile settings.`
        break
      case '110201':
        errorMessage = 'Sitekey validation error. The configured site key is invalid.'
        break
      case '110202':
        errorMessage = 'Connection validation error. Please check your internet connection.'
        break
      case '110203':
        errorMessage = 'Timeout error. Please refresh and try again.'
        break
      default:
        errorMessage = `Verification error (${errorCode}). Please try again.`
    }
    
    setError(errorMessage)
  }, [])

  const handleExpire = useCallback(() => {
    setError('Verification expired. Please try again.')
  }, [])

  if (!siteKey) {
    return (
      <div className="space-y-2">
        <div className="text-red-600 text-sm">{error}</div>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {debugInfo}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div>
      <Turnstile
        sitekey={siteKey}
        onSuccess={onSuccess}
        onError={handleError}
        onExpire={handleExpire}
        theme="light"
        retry="auto"
        retryInterval={5000}
        appearance="interaction-only"
        language="auto"
        refreshExpired="auto"
      />
      {error && (
        <div className="space-y-2">
          <div className="text-red-600 text-sm mt-2">{error}</div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto mt-2">
              {debugInfo}
            </pre>
          )}
        </div>
      )}
    </div>
  )
} 