import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'
import { User, Lock, Key } from 'lucide-react'

export default function SettingsView() {
  const { user, emailAliasId, logout } = useAuthStore()
  const [alias, setAlias] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlias = async () => {
      if (!emailAliasId) return

      const { data } = await supabase
        .from('email_aliases')
        .select('*')
        .eq('id', emailAliasId)
        .single()

      setAlias(data)
      setLoading(false)
    }

    fetchAlias()
  }, [emailAliasId])

  return (
    <div className="h-full p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-gray-900">{user?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <p className="text-gray-900 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Email Alias Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Email Alias</h2>
            </div>

            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : alias ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <p className="text-gray-900 font-medium">{alias.alias_email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <p className="text-gray-900">{alias.display_name}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alias.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {alias.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No email alias configured</p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            </div>

            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
