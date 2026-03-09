import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { Inbox, MailOpen, Star, RefreshCw, Mail, Search, ChevronDown, ChevronRight } from 'lucide-react'
import type { EmailInbound } from '../../types'

/**
 * Email Thread Group
 */
interface ThreadGroup {
  threadId: string
  emails: EmailInbound[]
  lastEmail: EmailInbound
  unreadCount: number
}

/**
 * InboxView Component
 *
 * Displays inbound emails with:
 * - Debounced search
 * - Pagination with "Load More"
 * - Threading/Conversation view
 * - Read/unread toggle
 * - Starred filter
 * - Mobile responsive
 */
export default function InboxView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()

  // Data state
  const [emails, setEmails] = useState<ThreadGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)

  // Pagination state
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch emails with pagination and search
  const fetchEmails = useCallback(async (pageNum: number, searchQuery: string = '', reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      let result
      if (searchQuery.trim()) {
        result = await emailInboundService.searchEmails(emailAliasId, searchQuery.trim(), {
          page: pageNum,
          pageSize: 20,
        })
      } else {
        result = await emailInboundService.getInboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: 20,
        })
      }

      // Group by thread
      const threadMap = new Map<string, EmailInbound[]>()

      // Process in order (already sorted by received_at desc)
      result.data.forEach(email => {
        const existing = threadMap.get(email.threadId) || []
        threadMap.set(email.threadId, [...existing, email])
      })

      // Convert to ThreadGroup array
      const threadGroups: ThreadGroup[] = Array.from(threadMap.values()).map(emails => {
        const lastEmail = emails[0]
        const unreadCount = emails.filter(e => !e.isRead).length

        return {
          threadId: emails[0].threadId,
          emails,
          lastEmail,
          unreadCount,
        }
      })

      if (reset || pageNum === 1) {
        setEmails(threadGroups)
      } else {
        setEmails(prev => [...prev, ...threadGroups])
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

  // Initial load and page changes
  useEffect(() => {
    setPage(1)
    fetchEmails(1, debouncedSearch, true)
  }, [emailAliasId, debouncedSearch, fetchEmails])

  // Load more handler
  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEmails(nextPage, debouncedSearch, false)
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Toggle thread expansion
  const toggleThreadExpansion = (threadId: string) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId)
    } else {
      newExpanded.add(threadId)
    }
    setExpandedThreads(newExpanded)
  }

  // Select thread for detail view
  const selectThread = (thread: ThreadGroup) => {
    setSelectedThreadId(thread.threadId)
    // Mark all emails in thread as read
    thread.emails.forEach(async email => {
      if (!email.isRead) {
        await emailInboundService.markAsRead(email.id)
      }
    })
    // Update local state
    setEmails(prev => prev.map(t => {
      if (t.threadId === thread.threadId) {
        return {
          ...t,
          emails: t.emails.map(e => ({ ...e, isRead: true })),
          unreadCount: 0,
        }
      }
      return t
    }))
  }

  // Toggle star
  const toggleStar = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation()
    try {
      await emailInboundService.toggleStarred(emailId)
      // Refresh to get updated state
      fetchEmails(page, debouncedSearch, false)
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  // Get thread preview snippet
  const getThreadPreview = (emails: EmailInbound[]) => {
    const lastEmail = emails[0]
    if (lastEmail.bodyText) {
      return lastEmail.bodyText.substring(0, 150) + (lastEmail.bodyText.length > 150 ? '...' : '')
    }
    if (lastEmail.bodyHtml) {
      const div = document.createElement('div')
      div.innerHTML = lastEmail.bodyHtml
      const text = div.textContent || div.innerText || ''
      return text.substring(0, 150) + (text.length > 150 ? '...' : '')
    }
    return '(No content)'
  }

  return (
    <div className="flex h-full">
      {/* Email List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Header with Search */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Inbox {totalCount > 0 && <span className="text-sm font-normal text-gray-500">({totalCount})</span>}
            </h2>
            <button
              onClick={() => fetchEmails(page, debouncedSearch, false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            )}
          </div>
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
              <p>{debouncedSearch ? 'No emails match your search' : 'No emails yet'}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {emails.map((thread) => (
                  <div key={thread.threadId}>
                    {/* Thread Summary Row */}
                    <div
                      onClick={() => selectThread(thread)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedThreadId === thread.threadId
                          ? 'bg-blue-50 border-l-4 border-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => toggleStar(e, thread.lastEmail.id)}
                          className="flex-shrink-0"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              thread.lastEmail.isStarred
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium truncate ${
                              thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-600'
                            }`}>
                              {thread.lastEmail.senderName || thread.lastEmail.senderEmail}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {format(new Date(thread.lastEmail.receivedAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className={`text-sm truncate mb-1 ${
                            thread.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                          }`}>
                            {thread.lastEmail.subject || '(No subject)'}
                          </p>
                          <div className="flex items-center gap-2">
                            {thread.unreadCount > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {thread.unreadCount} unread
                              </span>
                            )}
                            {thread.emails.length > 1 && (
                              <span className="text-xs text-gray-400">
                                {thread.emails.length} messages
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                            {getThreadPreview(thread.emails)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Thread Preview (showing 2nd, 3rd messages) */}
                    {expandedThreads.has(thread.threadId) && thread.emails.length > 1 && (
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                        {thread.emails.slice(1, 3).map((email, idx) => (
                          <div key={email.id} className="mb-2 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-600">
                                {email.senderName || email.senderEmail}
                              </span>
                              <span className="text-xs text-gray-400">
                                {format(new Date(email.receivedAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {email.subject || '(No subject)'}
                            </p>
                          </div>
                        ))}
                        {thread.emails.length > 3 && (
                          <button
                            onClick={() => navigate(`/thread/${thread.threadId}`)}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                          >
                            +{thread.emails.length - 3} more in this conversation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        Loading...
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Email Detail Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedThreadId ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedThreadId(null)}
                  className="md:hidden flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to list
                </button>
                <div className="hidden md:block flex-1" />
                <button
                  onClick={() => navigate('/compose')}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reply
                </button>
              </div>
            </div>

            {/* Thread Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const thread = emails.find(t => t.threadId === selectedThreadId)
                if (!thread) return null

                return thread.emails.map((email, idx) => (
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
                          {format(new Date(email.receivedAt), 'PPPp')}
                        </p>
                        {!email.isRead && (
                          <span className="text-xs text-blue-600 font-medium">New</span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {email.subject || '(No subject)'}
                    </h3>

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
                        onClick={(e) => toggleStar(e, email.id)}
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
                        onClick={() => navigate(`/compose?reply=${email.id}`)}
                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MailOpen className="w-16 h-16 mx-auto mb-4" />
              <p>Select an email or thread to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
