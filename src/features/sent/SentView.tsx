import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { Send, CheckCircle, XCircle, Clock, RefreshCw, Search } from 'lucide-react'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

/**
 * SentView Component
 *
 * Displays sent emails with:
 * - Debounced search
 * - Pagination with "Load More"
 * - Status indicators
 * - Mobile responsive
 */
export default function SentView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { confirm, confirmation } = useConfirmationModal()

  // Data state
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)

  // Pagination state
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch sent emails with pagination and search
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
        result = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: 20,
        })
        // Filter by search on client (since service doesn't support search yet)
        const filtered = result.data.filter(email =>
          email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        result = {
          data: filtered,
          count: filtered.length,
          hasMore: false, // Server-side count includes all, but filtered result is limited
        }
      } else {
        result = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: 20,
        })
      }

      setEmails(result.data)
      setHasMore(pageNum < 10) // Simple limit for demo; server should return hasMore
      setTotalCount(result.count)
    } catch (error) {
      console.error('Error fetching sent emails:', error)
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

  // Retry failed email
  const handleRetry = async (id: string) => {
    if (!emailAliasId) {
      alert('No email alias configured')
      return
    }

    const result = await confirm({
      title: 'Retry Email',
      message: 'Are you sure you want to retry sending this failed email?',
      confirmLabel: 'Retry',
      variant: 'warning',
    })

    if (!result) return

    try {
      await emailOutboundService.retryEmail(id, emailAliasId)
      // Refresh
      fetchEmails(page, debouncedSearch, false)
    } catch (error) {
      console.error('Error retrying email:', error)
      alert('Failed to retry: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-yellow-100 text-yellow-700'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Sent Emails {totalCount > 0 && <span className="text-lg font-normal text-gray-500">({totalCount})</span>}
            </h1>
            <button
              onClick={() => fetchEmails(page, debouncedSearch, false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by subject or recipient..."
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
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Send className="w-16 h-16 mb-4" />
            <p>{debouncedSearch ? 'No emails match your search' : 'No sent emails yet'}</p>
          </div>
        ) : (
          <>
            {confirmation && (
              <ConfirmationModal
                isOpen={confirmation.isOpen}
                title={confirmation.title}
                message={confirmation.message}
                confirmLabel={confirmation.confirmLabel}
                cancelLabel={confirmation.cancelLabel}
                variant={confirmation.variant}
                onConfirm={confirmation.onConfirm}
                onCancel={confirmation.onCancel}
              />
            )}

            <div className="divide-y divide-gray-100">
              {emails.map((email) => (
              <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {getStatusIcon(email.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {email.subject || '(No subject)'}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {format(new Date(email.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      To: {email.recipientEmail}
                      {email.cc && email.cc.length > 0 && (
                        <span className="text-gray-400">, Cc: {email.cc.join(', ')}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(email.status)}`}>
                        {getStatusText(email.status)}
                      </span>
                      {email.errorMessage && (
                        <span className="text-xs text-red-600">{email.errorMessage}</span>
                      )}
                      {email.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(email.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

        {/* Load More */}
        {hasMore && !loading && emails.length > 0 && (
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
      </div>
    </div>
  )
}
