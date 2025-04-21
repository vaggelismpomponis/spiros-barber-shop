'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserMenu } from './UserMenu'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    // Check initial auth state
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkUser()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
      if (event === 'SIGNED_IN') {
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <header className="w-full border-b border-gray-800 bg-[#1A1A1A] relative z-[40]">
      {/* Top header section for auth */}
      <div className="w-full bg-gray-50 py-2 border-b relative z-50">
        <div className="container mx-auto px-4 flex justify-end">
          <UserMenu isAuthenticated={isAuthenticated} />
        </div>
      </div>

      {/* Main header section */}
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative z-30">
        <Link href="/" className="text-2xl font-bold text-white">
          Barbershop
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/services" className="text-gray-300 hover:text-white transition-colors">
            Services
          </Link>
          <Link href="/bookings" className="text-gray-300 hover:text-white transition-colors">
            Book Now
          </Link>
          <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
            Contact
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 focus:outline-none text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[calc(4rem+2.5rem)] left-0 right-0 bg-[#1A1A1A] border-b border-gray-800 shadow-lg z-20">
          <nav className="container mx-auto px-4 py-3 flex flex-col space-y-3">
            <Link
              href="/services"
              className="text-gray-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              href="/bookings"
              className="text-gray-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Book Now
            </Link>
            <Link
              href="/contact"
              className="text-gray-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
} 