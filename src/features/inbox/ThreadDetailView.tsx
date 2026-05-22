import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { ArrowLeft, Star, MailOpen, Reply } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { PaperclipIcon } from '../../components/icons'
import type { EmailInbound } from '../../types'

export default function ThreadDetailView() {
  const { threadId } = useParams<{ threadId: string }>()
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()

  const [thread, setThread] = useState<EmailInbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!threadId || !emailAliasId) return

    const fetchThread = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const emails = await emailInboundService.getThread(threadId)
        const filtered = emails.filter(e => e.aliasId === emailAliasId)
        setThread(filtered)
      } catch (error) {
        console.error('Error fetching thread:', error)
        setLoadError('Failed to load thread. Please try again.')
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
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <p className="text-lg font-medium mb-2" style={{ color: colors.textPrimary }}>Failed to load thread</p>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg font-medium"
            style={{ backgroundColor: colors.primary, color: '#ffffff' }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (thread.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: colors.background }}>
        <MailOpen size={64} className="mb-4 opacity-30" style={{ color: colors.textSecondary }} />
        <p style={{ color: colors.textSecondary }}>Thread not found</p>
        <button
          onClick={() => navigate('/inbox')}
          className="mt-4 font-medium hover:underline"
          style={{ color: colors.primary }}
        >
          Back to Inbox
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/inbox')}
            className="flex items-center gap-2 text-sm mb-4 hover:underline"
            style={{ color: colors.textSecondary }}
          >
            <ArrowLeft size={16} />
            Back to Inbox
          </button>

          <h1 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            {thread[0].subject || '(No subject)'}
          </h1>

          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {thread.length} message{thread.length > 1 ? 's' : ''} in this conversation
          </p>
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full p-6 space-y-6">
        {thread.map((email, idx) => (
          <div
            key={email.id}
            className={`pb-6 ${idx > 0 ? 'border-t' : ''}`}
            style={{ borderColor: colors.divider }}
          >
            <div className="flex items-center gap-4 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                {(email.senderName || email.senderEmail)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: colors.textPrimary }}>
                  {email.senderName || email.senderEmail}
                </p>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {email.senderEmail}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: colors.textTertiary }}>
                  {format(new Date(email.receivedAt), 'PPPPp')}
                </p>
                {!email.isRead && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: colors.primary + '20', color: colors.primary }}
                  >
                    Unread
                  </span>
                )}
              </div>
            </div>

            <div className="ml-14">
              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.searchBackground }}>
                  <p className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {email.attachments.map((att, attIdx) => (
                      <span
                        key={attIdx}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                        style={{ backgroundColor: colors.surface, color: colors.textPrimary, border: `1px solid ${colors.divider}` }}
                      >
                        <PaperclipIcon size={14} /> {att.filename}
                        <span style={{ color: colors.textTertiary }}>({(att.size / 1024).toFixed(1)} KB)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="prose max-w-none" style={{ color: colors.textPrimary }}>
                {email.bodyHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                ) : (
                  <div className="whitespace-pre-wrap">{email.bodyText}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderColor: colors.divider }}>
                <button
                  onClick={() => toggleStar(email.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    email.isStarred ? 'bg-yellow-100 text-yellow-700' : ''
                  }`}
                  style={{
                    backgroundColor: email.isStarred ? undefined : colors.surfaceHover,
                    color: email.isStarred ? undefined : colors.textSecondary,
                  }}
                >
                  <Star size={14} fill={email.isStarred ? 'currentColor' : 'none'} />
                  {email.isStarred ? 'Starred' : 'Star'}
                </button>
                <button
                  onClick={() => handleReply(email)}
                  className="px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{ backgroundColor: colors.accent, color: colors.primary }}
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
