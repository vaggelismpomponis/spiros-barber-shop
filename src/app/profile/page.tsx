'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PasswordInput from '@/components/PasswordInput'
import { validatePassword } from '@/lib/passwordUtils'

interface Profile {
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<Profile>({
    email: '',
    full_name: '',
    phone: '',
    avatar_url: null
  })

  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // First try to get the profile
      let { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create it
      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: '',
            phone: '',
            avatar_url: null,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`)
        }

        profile = newProfile
      } else if (fetchError) {
        throw fetchError
      }

      // Set the profile data
      const profileData = {
        email: user.email || '',
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        avatar_url: profile?.avatar_url || null
      }

      setProfile(profileData)
      setFormData(profileData)
    } catch (error) {
      console.error('Profile error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred while loading your profile')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    try {
      setUploadingImage(true)
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload image
      const filePath = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError, data } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })

      if (updateError) throw updateError

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
      setMessage('Profile image updated successfully')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error uploading image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      // Update password if provided
      if (password) {
        const strength = validatePassword(password)
        if (!strength.isValid) {
          throw new Error('Password does not meet requirements')
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
        })

        if (passwordError) throw passwordError
      }

      setMessage('Profile updated successfully')
      setIsEditing(false)
      setPassword('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Περιμένετε...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold mb-8 text-center">Ρυθμίσεις Προφίλ</h1>

            {/* Profile Image Section */}
            <div className="mb-8 flex flex-col items-center">
              <div className="relative w-32 h-32 mb-4">
                {formData.avatar_url ? (
                  <Image
                    src={formData.avatar_url}
                    alt="Profile"
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <svg className="h-16 w-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="text-white">Περιμένετε...</div>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="bg-[#1A1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A]"
              >
                {uploadingImage ? 'Uploading...' : 'Αλλαγή εικόνας προφίλ'}
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ονοματεπώνυμο
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Τηλέφωνο
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>

              {isEditing && (
                <div>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    label="Νέος Κωδικός (προαιρετικά)"
                    autoComplete="new-password"
                    showStrengthIndicator
                  />
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-green-600 text-sm">
                  {message}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="bg-[#1A1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A]"
                  >
                    Επεξεργασία προφίλ
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        setPassword('')
                        setFormData(profile || formData)
                      }}
                      className="bg-[#1A1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A]"
                    >
                      Ακύρωση
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#1A1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A]"
                    >
                      {loading ? 'Αποθήκευση...' : 'Αποθήκευση αλλαγών'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 