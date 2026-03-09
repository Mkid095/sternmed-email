import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { Star, RefreshCw, Search, MailOpen } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { PaperclipIcon } from '../../components/icons'
import type { EmailInbound } from '../../types'

interface ThreadGroup {
  threadId: string
  emails: EmailInbound[]
  lastEmail: EmailInbound
  unreadCount: number
}

export default function InboxView() {
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

  const fetchThreads = useCallback(async (pageNum: number, search: string = '', reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      let result
      if (search.trim()) {
        result = await emailInboundService.searchEmails(emailAliasId, search.trim(), {
          page: pageNum,
          pageSize: 20,
        })
      } else {
        result = await emailInboundService.getInboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: 20,
        })
      }

      // Group by thread (already sorted by received_at desc)
      const threadMap = new Map<string, EmailInbound[]>()
      result.data.forEach(email => {
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

      setHasMore(result.hasMore)
      setTotalCount(result.count)
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  useEffect(() => {
    setPage(1)
    fetchThreads(1, debouncedSearch, true)
  }, [emailAliasId, debouncedSearch, fetchThreads])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchThreads(nextPage, debouncedSearch, false)
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

  const toggleStar = async (e?: React.MouseEvent, emailId?: string) => {
    if (e) e.stopPropagation()
    if (!emailId) return
    try {
      await emailInboundService.toggleStarred(emailId)
      fetchThreads(page, debouncedSearch, false)
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const selectedThread = threads.find(t => t.threadId === selectedThreadId)

  return (
    <div className="flex h-full">
      {/* Email List */}
      <div
        className="flex flex-col border-r"
        style={{
          width: '400px',
          backgroundColor: colors.surface,
          borderColor: colors.divider,
        }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: colors.divider }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg" style={{ color: colors.textPrimary }}>
              Inbox
              {totalCount > 0 && (
                <span className="ml-2 text-sm font-normal" style={{ color: colors.textSecondary }}>
                  {totalCount}
                </span>
              )}
            </h2>
            <button
              onClick={() => fetchThreads(page, debouncedSearch, false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: colors.textTertiary }} />
            <input
              type="text"
              placeholder="Search emails..."
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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64" style={{ color: colors.textSecondary }}>
              <MailOpen size={48} className="mb-4 opacity-50" />
              <p>{debouncedSearch ? 'No emails match your search' : 'No emails yet'}</p>
            </div>
          ) : (
            <>
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
                        onClick={(e) => toggleStar(e, thread.lastEmail.id)}
                        className="flex-shrink-0"
                      >
                        <Star
                          size={18}
                          className={thread.lastEmail.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}
                          style={{ color: thread.lastEmail.isStarred ? undefined : colors.textTertiary }}
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
                          {thread.lastEmail.bodyText?.substring(0, 50) || ''}...
                        </p>
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {thread.unreadCount > 0 && (
                      <div className="mt-2 ml-8">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: colors.primary + '20', color: colors.primary }}
                        >
                          {thread.unreadCount} new
                        </span>
                      </div>
                    )}
                  </div>
                ))}
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
            </>
          )}
        </div>
      </div>

      {/* Thread Detail */}
      <div
        className="flex-1 flex flex-col bg-white overflow-hidden"
        style={{ backgroundColor: colors.surface }}
      >
        {selectedThread ? (
          <>
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-xl font-bold break-words"
                    style={{ color: colors.textPrimary }}
                  >
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedThread.emails.map((email, idx) => (
                <div
                  key={email.id}
                  className={`${idx > 0 ? 'pt-6 border-t' : ''}`}
                  style={{ borderColor: colors.divider }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {(email.senderName || email.senderEmail)?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold" style={{ color: colors.textPrimary }}>
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

                  {/* Attachments */}
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.searchBackground }}>
                      <p className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {email.attachments.map((att, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm"
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
                      onClick={() => toggleStar(undefined, email.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        email.isStarred
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 dark:bg-gray-700'
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
                      onClick={() => navigate(`/compose?reply=${email.id}`)}
                      className="px-3 py-1.5 rounded-full text-sm transition-colors"
                      style={{ backgroundColor: colors.accent, color: colors.primary }}
                    >
                      Reply
                    </button>
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
    </div>
  )
}
