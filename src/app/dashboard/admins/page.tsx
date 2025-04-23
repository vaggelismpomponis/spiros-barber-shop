'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface Admin {
  id: string
  email: string
  created_at: string
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      try {
        // Check if current user is admin
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) {
          router.push('/auth/signin')
          return
        }

        const { data: adminCheck } = await supabase
          .from('admins')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!adminCheck) {
          router.push('/')
          return
        }

        // Fetch all admins
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .order('created_at', { ascending: true })

        if (adminError) throw adminError
        setAdmins(adminData)
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAndFetchData()
  }, [])

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminEmail.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('admins')
        .insert([{ email: newAdminEmail.trim() }])

      if (insertError) throw insertError

      // Refresh admin list
      const { data: adminData, error: fetchError } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setAdmins(adminData)
      setNewAdminEmail('')
    } catch (error) {
      console.error('Error adding admin:', error)
      setError(error instanceof Error ? error.message : 'Failed to add admin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveAdmin = async (adminEmail: string) => {
    // Don't allow removing the last admin
    if (admins.length <= 1) {
      setError('Cannot remove the last admin')
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('admins')
        .delete()
        .eq('email', adminEmail)

      if (deleteError) throw deleteError

      // Refresh admin list
      const { data: adminData, error: fetchError } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setAdmins(adminData)
    } catch (error) {
      console.error('Error removing admin:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove admin')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold mb-6">Διαχείριση Διαχειριστών
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {/* Add new admin form */}
            <form onSubmit={handleAddAdmin} className="mb-8">
              <div className="flex gap-4">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="Εισαγάγετε email για προσθήκη ως διαχειριστή"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newAdminEmail.trim()}
                  className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {isSubmitting ? '...' : 'Προσθήκη Διαχειριστή'}
                </button>
              </div>
            </form>

            {/* Admin list */}
            <div className="bg-gray-50 rounded-md">
              <h2 className="text-lg font-semibold mb-4">Τρέχοντες διαχειριστές
              </h2>
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between bg-white p-4 rounded-md shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{admin.email}</p>
                      <p className="text-xs text-gray-500">
                        Added: {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.email)}
                      disabled={admins.length <= 1}
                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:text-gray-400"
                    >
                      Αφαίρεση
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 