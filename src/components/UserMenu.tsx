'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface UserMenuProps {
  isAuthenticated: boolean
}

export function UserMenu({ isAuthenticated }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true)
      try {
        if (!isAuthenticated) {
          setUser(null)
          setProfile(null)
          setIsAdmin(false)
          return
        }

        // Get current session
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) return

        setUser(currentUser)

        // Check if admin
        const { data: adminData } = await supabase
          .from('admins')
          .select('id')
          .eq('email', currentUser.email)
          .single()
        
        setIsAdmin(!!adminData)

        // Get profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        setProfile(profileData)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [isAuthenticated])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/auth/signin"
          className="text-sm font-medium text-black hover:text-gray-400 bg-white px-4 py-2 rounded-md border border-black"
        >
          Σύνδεση
        </Link>
        <Link
          href="/auth/signup"
          className="text-sm font-medium text-white bg-black px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Εγγραφή
        </Link>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center focus:outline-none"
      >
        <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-white text-base font-medium border-2 border-white hover:border-gray-300 transition-colors overflow-hidden">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt="Profile"
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            user?.email?.[0].toUpperCase() || 'U'
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'User'}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            {isAdmin && <p className="text-xs text-blue-600 mt-1">Admin</p>}
          </div>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Profile Settings
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Admin Dashboard
            </Link>
          )}
          <Link
            href="/bookings"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            My Bookings
          </Link>
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
} 