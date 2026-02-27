import { useState, useEffect } from 'react'
import { supabase, EmailInbound } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { Inbox, MailOpen, Star, Trash2, RefreshCw } from 'lucide-react'

export default function InboxView() {
  const { emailAliasId } = useAuthStore()
  const [emails, setEmails] = useState<EmailInbound[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchEmails = async () => {
    if (!emailAliasId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('email_inbound')
      .select('*')
      .eq('alias_id', emailAliasId)
      .order('received_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching emails:', error)
    } else {
      setEmails(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEmails()
  }, [emailAliasId])

  const markAsRead = async (id: string) => {
    await supabase
      .from('email_inbound')
      .update({ is_read: true })
      .eq('id', id)
    
    setEmails(emails.map(e => e.id === id ? { ...e, is_read: true } : e))
  }

  const toggleStar = async (id: string) => {
    const email = emails.find(e => e.id === id)
    if (!email) return

    await supabase
      .from('email_inbound')
      .update({ is_starred: !email.is_starred })
      .eq('id', id)
    
    setEmails(emails.map(e => e.id === id ? { ...e, is_starred: !e.is_starred } : e))
  }

  const selectedEmail = emails.find(e => e.id === selectedId)

  return (
    <div className="flex h-full">
      {/* Email List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Inbox</h2>
          <button
            onClick={fetchEmails}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Inbox className="w-12 h-12 mb-4" />
              <p>No emails yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedId(email.id)
                    if (!email.is_read) markAsRead(email.id)
                  }}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedId === email.id
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  } ${!email.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(email.id)
                      }}
                      className="flex-shrink-0"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          email.is_starred
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium truncate ${
                          !email.is_read ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {email.sender_name || email.sender_email}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {format(new Date(email.received_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${
                        !email.is_read ? 'font-medium text-gray-900' : 'text-gray-600'
                      }`}>
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {email.body_text?.substring(0, 100) || '(No preview)'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedEmail ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedEmail.subject || '(No subject)'}
              </h1>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {(selectedEmail.sender_name || selectedEmail.sender_email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedEmail.sender_name || selectedEmail.sender_email}
                    </p>
                    <p className="text-sm text-gray-500">{selectedEmail.sender_email}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {format(new Date(selectedEmail.received_at), 'PPPp')}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedEmail.body_html ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                />
              ) : selectedEmail.body_text ? (
                <div className="whitespace-pre-wrap text-gray-800">{selectedEmail.body_text}</div>
              ) : (
                <p className="text-gray-500 italic">No content</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MailOpen className="w-16 h-16 mx-auto mb-4" />
              <p>Select an email to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
