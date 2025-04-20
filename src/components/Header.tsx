'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserMenu } from './UserMenu'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="w-full border-b bg-white relative z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-black">
          Barbershop
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/services" className="text-gray-600 hover:text-black transition-colors">
            Services
          </Link>
          <Link href="/bookings" className="text-gray-600 hover:text-black transition-colors">
            Book Now
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-black transition-colors">
            Contact
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
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

        <div className="flex items-center">
          <UserMenu />
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b shadow-lg">
          <nav className="container mx-auto px-4 py-3 flex flex-col space-y-3">
            <Link
              href="/services"
              className="text-gray-600 hover:text-black transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              href="/bookings"
              className="text-gray-600 hover:text-black transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Book Now
            </Link>
            <Link
              href="/contact"
              className="text-gray-600 hover:text-black transition-colors py-2"
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