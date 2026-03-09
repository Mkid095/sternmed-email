import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useTheme } from '../../contexts/ThemeContext'
import { Search, Mail, Send, File } from 'lucide-react'
import type { EmailInbound } from '../../types'
import { format } from 'date-fns'

interface SearchResult {
  inbound: EmailInbound[]
  sent: any[]
  drafts: any[]
  loading: boolean
  error?: string
}

export default function GlobalSearchView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()

  const [results, setResults] = useState<SearchResult>({
    inbound: [],
    sent: [],
    drafts: [],
    loading: true,
  })

  useEffect(() => {
    if (!emailAliasId || !query.trim()) {
      setResults(prev => ({ ...prev, loading: false }))
      return
    }

    const searchAll = async () => {
      setResults(prev => ({ ...prev, loading: true }))

      try {
        // Search inbound emails (server-side)
        const inboundRes = await emailInboundService.searchEmails(emailAliasId, query, {
          page: 1,
          pageSize: 50,
        })

        // Get sent emails (client-side filter)
        const sentRes = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: 1,
          pageSize: 100,
        })
        const sentFiltered = sentRes.data.filter(email =>
          email.subject?.toLowerCase().includes(query.toLowerCase()) ||
          email.recipientEmail?.toLowerCase().includes(query.toLowerCase())
        )

        // Get drafts (client-side filter)
        const draftsRes = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: 1,
          pageSize: 100,
          status: 'pending',
        })
        const draftsFiltered = draftsRes.data.filter(draft =>
          draft.subject?.toLowerCase().includes(query.toLowerCase()) ||
          draft.recipientEmail?.toLowerCase().includes(query.toLowerCase())
        )

        setResults({
          inbound: inboundRes.data,
          sent: sentFiltered,
          drafts: draftsFiltered,
          loading: false,
        })
      } catch (error) {
        console.error('Search error:', error)
        setResults(prev => ({ ...prev, loading: false, error: 'Failed to search' }))
      }
    }

    searchAll()
  }, [emailAliasId, query])

  const totalCount = results.inbound.length + results.sent.length + results.drafts.length

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm mb-4"
            style={{ color: colors.textSecondary }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
            Back
          </button>

          <h1 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            Search Results
          </h1>

          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {query && `"${query}"`} — {totalCount} result{totalCount !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {results.loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
            </div>
          ) : results.error ? (
            <div className="text-center py-12" style={{ color: colors.textSecondary }}>
              <p>{results.error}</p>
            </div>
          ) : (
            <>
              {/* Inbox Results */}
              {results.inbound.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <InboxIcon size={20} style={{ color: colors.primary }} />
                    <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                      Inbox ({results.inbound.length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {results.inbound.map(email => (
                      <div
                        key={email.id}
                        onClick={() => navigate(`/thread/${email.threadId}`)}
                        className="p-4 rounded-lg cursor-pointer transition-colors"
                        style={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.divider}`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium truncate" style={{ color: colors.textPrimary }}>
                            {email.subject || '(No subject)'}
                          </p>
                          <span className="text-xs flex-shrink-0 ml-2" style={{ color: colors.textTertiary }}>
                            {format(new Date(email.receivedAt), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-sm truncate" style={{ color: colors.textSecondary }}>
                          From: {email.senderName || email.senderEmail}
                        </p>
                        <p className="text-xs truncate mt-1" style={{ color: colors.textTertiary }}>
                          {email.bodyText?.substring(0, 50)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Sent Results */}
              {results.sent.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <SendIcon size={20} style={{ color: colors.primary }} />
                    <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                      Sent ({results.sent.length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {results.sent.map(email => (
                      <div
                        key={email.id}
                        onClick={() => navigate('/sent')}
                        className="p-4 rounded-lg cursor-pointer transition-colors"
                        style={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.divider}`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium truncate" style={{ color: colors.textPrimary }}>
                            {email.subject || '(No subject)'}
                          </p>
                          <span className="text-xs flex-shrink-0 ml-2" style={{ color: colors.textTertiary }}>
                            {format(new Date(email.createdAt), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-sm truncate" style={{ color: colors.textSecondary }}>
                          To: {email.recipientEmail}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Drafts Results */}
              {results.drafts.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <FileIcon size={20} style={{ color: colors.primary }} />
                    <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                      Drafts ({results.drafts.length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {results.drafts.map(draft => (
                      <div
                        key={draft.id}
                        onClick={() => navigate('/drafts')}
                        className="p-4 rounded-lg cursor-pointer transition-colors"
                        style={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.divider}`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium truncate" style={{ color: colors.textPrimary }}>
                            {draft.subject || '(No subject)'}
                          </p>
                          <span className="text-xs flex-shrink-0 ml-2" style={{ color: colors.textTertiary }}>
                            {format(new Date(draft.updatedAt || draft.createdAt), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-sm truncate" style={{ color: colors.textSecondary }}>
                          To: {draft.recipientEmail}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {totalCount === 0 && (
                <div className="text-center py-12" style={{ color: colors.textSecondary }}>
                  <Search size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No results found for "{query}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Need to import these icons
const InboxIcon = (props: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H5v-2h14v2zm0-4H5v-2h14v2zm0-4H5V7h14v2z"/>
  </svg>
)

const SendIcon = (props: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
)

const FileIcon = (props: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5c-.55 0-1-.45-1-1V7l8 5 8-5v10c0 .55-.45 1-1 1z"/>
  </svg>
)
