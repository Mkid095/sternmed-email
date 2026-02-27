import { useState, useEffect } from 'react'
import { supabase, EmailOutbound } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function SentView() {
  const { emailAliasId } = useAuthStore()
  const [emails, setEmails] = useState<EmailOutbound[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSent = async () => {
      if (!emailAliasId) return

      setLoading(true)
      const { data, error } = await supabase
        .from('email_outbound')
        .select('*')
        .eq('alias_id', emailAliasId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching sent emails:', error)
      } else {
        setEmails(data || [])
      }
      setLoading(false)
    }

    fetchSent()
  }, [emailAliasId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent': return 'Sent'
      case 'failed': return 'Failed'
      case 'pending': return 'Sending...'
      default: return status
    }
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sent Emails</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Send className="w-16 h-16 mb-4" />
            <p>No sent emails yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-100">
              {emails.map((email) => (
                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getStatusIcon(email.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {email.subject}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {format(new Date(email.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        To: {email.recipient_email}
                        {email.cc && email.cc.length > 0 && (
                          <span>, Cc: {email.cc.join(', ')}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          email.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : email.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getStatusText(email.status)}
                        </span>
                        {email.error_message && (
                          <span className="text-xs text-red-600">{email.error_message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
