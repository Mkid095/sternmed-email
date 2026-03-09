import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { RefreshCw, Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

export default function SentView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const fetchEmails = useCallback(async (pageNum: number, search: string = '', reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      let result
      if (search.trim()) {
        result = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: 20,
        })
        const query = search.toLowerCase()
        const filtered = result.data.filter(email =>
          email.subject?.toLowerCase().includes(query) ||
          email.recipientEmail?.toLowerCase().includes(query)
        )
        result = { data: filtered, count: filtered.length, hasMore: false }
      } else {
        result = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: 20,
        })
      }

      setEmails(result.data)
      setHasMore(pageNum < 10)
      setTotalCount(result.count)
    } catch (error) {
      console.error('Error fetching sent emails:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  useEffect(() => {
    setPage(1)
    fetchEmails(1, debouncedSearch, true)
  }, [emailAliasId, debouncedSearch, fetchEmails])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEmails(nextPage, debouncedSearch, false)
  }

  const handleRetry = async (id: string) => {
    if (!emailAliasId) return

    const result = await confirm({
      title: 'Retry Email',
      message: 'Resend this failed email?',
      confirmLabel: 'Retry',
      variant: 'warning',
    })

    if (!result) return

    try {
      await emailOutboundService.retryEmail(id, emailAliasId)
      fetchEmails(page, debouncedSearch, false)
    } catch (error) {
      console.error('Error retrying email:', error)
      alert('Failed to retry: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const getStatusBadge = (status: string) => {
    const baseStyle = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'sent':
        return `${baseStyle} bg-green-100 text-green-700`
      case 'failed':
        return `${baseStyle} bg-red-100 text-red-700`
      default:
        return `${baseStyle} bg-yellow-100 text-yellow-700`
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              Sent
              {totalCount > 0 && (
                <span className="ml-2 text-lg font-normal" style={{ color: colors.textSecondary }}>
                  {totalCount}
                </span>
              )}
            </h1>
            <button
              onClick={() => fetchEmails(page, debouncedSearch, false)}
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
              placeholder="Search sent emails..."
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
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: colors.textSecondary }}>
            <Clock size={64} className="mb-4 opacity-30" />
            <p className="text-lg">{debouncedSearch ? 'No emails match your search' : 'No sent emails yet'}</p>
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

            <div className="divide-y" style={{ borderColor: colors.divider }}>
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {email.status === 'sent' && <CheckCircle size={18} className="text-green-600" />}
                      {email.status === 'failed' && <XCircle size={18} className="text-red-600" />}
                      {email.status === 'pending' && <Clock size={18} className="text-yellow-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className="font-medium truncate"
                          style={{ color: colors.textPrimary }}
                        >
                          {email.subject || '(No subject)'}
                        </h3>
                        <span className="text-xs flex-shrink-0 ml-2" style={{ color: colors.textTertiary }}>
                          {format(new Date(email.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                        To: {email.recipientEmail}
                        {email.cc && email.cc.length > 0 && (
                          <span className="text-gray-400">, Cc: {email.cc.join(', ')}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={getStatusBadge(email.status)}>
                          {email.status === 'sent' ? 'Sent' : email.status === 'failed' ? 'Failed' : 'Sending...'}
                        </span>
                        {email.errorMessage && (
                          <span className="text-xs text-red-600">{email.errorMessage}</span>
                        )}
                        {email.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(email.id)}
                            className="text-xs hover:underline"
                            style={{ color: colors.primary }}
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
  )
}
