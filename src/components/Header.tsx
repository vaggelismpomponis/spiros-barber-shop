import Link from 'next/link'
import { UserMenu } from './UserMenu'

export function Header() {
  return (
    <header className="w-full border-b bg-white relative z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-black">
          Barbershop
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/services" className="text-gray-600 hover:text-black transition-colors">
            Services
          </Link>
          <Link href="/bookings" className="text-gray-600 hover:text-black transition-colors">
            Book Now
          </Link>
        </nav>

        <UserMenu />
      </div>
    </header>
  )
} 