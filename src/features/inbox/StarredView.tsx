import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { Star, RefreshCw, Search, MailOpen } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { EmailInbound } from '../../types'

interface ThreadGroup {
  threadId: string
  emails: EmailInbound[]
  lastEmail: EmailInbound
  unreadCount: number
}

export default function StarredView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()

  const [threads, setThreads] = useState<ThreadGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const fetchStarred = useCallback(async (pageNum: number, search: string = '', reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      // Use getInboundEmails with starredOnly flag
      // For search, we still use the same API but client-side filter (like InboxView)
      const result = await emailInboundService.getInboundEmails(emailAliasId, {
        page: pageNum,
        pageSize: 20,
        starredOnly: true,
      })

      // If searching, apply client-side filter
      let filteredData = result.data
      if (search.trim()) {
        const query = search.toLowerCase()
        filteredData = result.data.filter(email =>
          email.subject?.toLowerCase().includes(query) ||
          email.senderEmail?.toLowerCase().includes(query) ||
          email.senderName?.toLowerCase().includes(query)
        )
      }

      // Group by thread
      const threadMap = new Map<string, EmailInbound[]>()
      filteredData.forEach(email => {
        const existing = threadMap.get(email.threadId) || []
        threadMap.set(email.threadId, [...existing, email])
      })

      const threadGroups: ThreadGroup[] = Array.from(threadMap.values()).map(emails => ({
        threadId: emails[0].threadId,
        emails,
        lastEmail: emails[0],
        unreadCount: emails.filter(e => !e.isRead).length,
      }))

      if (reset || pageNum === 1) {
        setThreads(threadGroups)
      } else {
        setThreads(prev => [...prev, ...threadGroups])
      }

      // For search, we're doing client-side filtering, so hasMore depends on whether we got all starred
      setHasMore(search.trim() ? false : result.hasMore)
      setTotalCount(search.trim() ? threadGroups.length : result.count)
    } catch (error) {
      console.error('Error fetching starred emails:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  useEffect(() => {
    setPage(1)
    fetchStarred(1, debouncedSearch, true)
  }, [emailAliasId, debouncedSearch, fetchStarred])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchStarred(nextPage, debouncedSearch, false)
  }

  const selectThread = async (thread: ThreadGroup) => {
    setSelectedThreadId(thread.threadId)

    // Mark all as read
    thread.emails.forEach(async email => {
      if (!email.isRead) {
        await emailInboundService.markAsRead(email.id)
      }
    })

    setThreads(prev => prev.map(t =>
      t.threadId === thread.threadId
        ? { ...t, emails: t.emails.map(e => ({ ...e, isRead: true })), unreadCount: 0 }
        : t
    ))
  }

  const toggleStar = async (emailId: string) => {
    try {
      await emailInboundService.toggleStarred(emailId)
      fetchStarred(page, debouncedSearch, false)
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const selectedThread = threads.find(t => t.threadId === selectedThreadId)

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              Starred
              {totalCount > 0 && (
                <span className="ml-2 text-lg font-normal" style={{ color: colors.textSecondary }}>
                  {totalCount}
                </span>
              )}
            </h1>
            <button
              onClick={() => fetchStarred(page, debouncedSearch, false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: colors.textSecondary }}
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: colors.textTertiary }} />
            <input
              type="text"
              placeholder="Search starred emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full text-sm outline-none"
              style={{
                backgroundColor: colors.searchBackground,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: colors.textSecondary }}>
            <Star size={64} className="mb-4 opacity-30" />
            <p className="text-lg">{debouncedSearch ? 'No starred emails match your search' : 'No starred emails yet'}</p>
            <p className="text-sm mt-2 opacity-70">Click the star icon on emails to mark them as important</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col border-r" style={{ width: '400px', backgroundColor: colors.surface, borderColor: colors.divider }}>
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y" style={{ borderColor: colors.divider }}>
                  {threads.map((thread) => (
                    <div
                      key={thread.threadId}
                      onClick={() => selectThread(thread)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedThreadId === thread.threadId
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                      }`}
                      style={{
                        backgroundColor: selectedThreadId === thread.threadId ? colors.selected : undefined,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleStar(thread.lastEmail.id)}
                          className="flex-shrink-0"
                        >
                          <Star
                            size={18}
                            className="fill-yellow-400 text-yellow-400"
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="font-medium truncate"
                              style={{
                                color: thread.unreadCount > 0 ? colors.textPrimary : colors.textSecondary,
                                fontWeight: thread.unreadCount > 0 ? 700 : 400,
                              }}
                            >
                              {thread.lastEmail.senderName || thread.lastEmail.senderEmail}
                            </span>
                            <span className="text-xs flex-shrink-0 ml-2" style={{ color: colors.textTertiary }}>
                              {format(new Date(thread.lastEmail.receivedAt), 'MMM d')}
                            </span>
                          </div>
                          <p
                            className="text-sm truncate mb-1"
                            style={{
                              color: thread.unreadCount > 0 ? colors.textPrimary : colors.textSecondary,
                              fontWeight: thread.unreadCount > 0 ? 500 : 400,
                            }}
                          >
                            {thread.lastEmail.subject || '(No subject)'}
                          </p>
                          <p className="text-xs truncate" style={{ color: colors.textTertiary }}>
                            {thread.lastEmail.bodyText?.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {hasMore && (
                <div className="p-4 border-t" style={{ borderColor: colors.divider }}>
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      color: colors.primary,
                      backgroundColor: loadingMore ? colors.surfaceHover : 'transparent',
                    }}
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }} />
                        Loading...
                      </span>
                    ) : (
                      'Load more'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Thread Detail */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {selectedThread ? (
                <>
                  <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold break-words" style={{ color: colors.textPrimary }}>
                          {selectedThread.lastEmail.subject || '(No subject)'}
                        </h1>
                        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                          {selectedThread.emails.length} message{selectedThread.emails.length > 1 ? 's' : ''} in this conversation
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/compose')}
                        className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                        style={{ backgroundColor: colors.primary, color: 'white' }}
                      >
                        Reply
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {selectedThread.emails.map((email, idx) => (
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
                              {format(new Date(email.receivedAt), 'PPPp')}
                            </p>
                          </div>
                        </div>

                        <div className="ml-14">
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
                                    📎 {att.filename}
                                    <span style={{ color: colors.textTertiary }}>({(att.size / 1024).toFixed(1)} KB)</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="prose max-w-none" style={{ color: colors.textPrimary }}>
                            {email.bodyHtml ? (
                              <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                            ) : (
                              <div className="whitespace-pre-wrap">{email.bodyText}</div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderColor: colors.divider }}>
                            <button
                              onClick={() => toggleStar(email.id)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors bg-yellow-100 text-yellow-700"
                            >
                              <Star size={14} fill="currentColor" />
                              Starred
                            </button>
                            <button
                              onClick={() => navigate(`/compose?reply=${email.id}`)}
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
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center" style={{ color: colors.textSecondary }}>
                  <div className="text-center">
                    <MailOpen size={64} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Select an email to read</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
