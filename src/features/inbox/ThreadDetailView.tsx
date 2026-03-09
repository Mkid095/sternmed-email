import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { ArrowLeft, Star, MailOpen, Reply } from 'lucide-react'
import type { EmailInbound } from '../../types'

export default function ThreadDetailView() {
  const { threadId } = useParams<{ threadId: string }>()
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()

  const [thread, setThread] = useState<EmailInbound[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!threadId || !emailAliasId) return

    const fetchThread = async () => {
      setLoading(true)
      try {
        const emails = await emailInboundService.getThread(threadId)
        // Only show emails for this alias
        const filtered = emails.filter(e => e.aliasId === emailAliasId)
        setThread(filtered)
      } catch (error) {
        console.error('Error fetching thread:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchThread()
  }, [threadId, emailAliasId])

  const toggleStar = async (emailId: string) => {
    try {
      await emailInboundService.toggleStarred(emailId)
      setThread(prev => prev.map(e => e.id === emailId ? { ...e, isStarred: !e.isStarred } : e))
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const handleReply = (email: EmailInbound) => {
    navigate(`/compose?reply=${email.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (thread.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <MailOpen className="w-16 h-16 mb-4" />
        <p>Thread not found</p>
        <button
          onClick={() => navigate('/inbox')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Inbox
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/inbox')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inbox
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {thread[0].subject || '(No subject)'}
          </h1>

          <p className="text-sm text-gray-500">
            {thread.length} message{thread.length > 1 ? 's' : ''} in this conversation
          </p>
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full p-6 space-y-6">
        {thread.map((email, idx) => (
          <div key={email.id} className={`${idx > 0 ? 'pt-6 border-t border-gray-100' : ''}`}>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {(email.senderName || email.senderEmail)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {email.senderName || email.senderEmail}
                </p>
                <p className="text-sm text-gray-500">{email.senderEmail}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {format(new Date(email.receivedAt), 'PPPPp')}
                </p>
                {!email.isRead && (
                  <span className="text-xs text-blue-600 font-medium">Unread</span>
                )}
              </div>
            </div>

            <div className="ml-14">
              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {email.attachments.map((att, attIdx) => (
                      <span
                        key={attIdx}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
                      >
                        📎 {att.filename}
                        <span className="text-gray-400">({(att.size / 1024).toFixed(1)} KB)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="prose max-w-none">
                {email.bodyHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-800">{email.bodyText}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => toggleStar(email.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    email.isStarred
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Star className={`w-4 h-4 ${email.isStarred ? 'fill-yellow-400' : ''}`} />
                  {email.isStarred ? 'Starred' : 'Star'}
                </button>
                <button
                  onClick={() => handleReply(email)}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
