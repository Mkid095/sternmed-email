/**
 * Sent View Component
 *
 * Displays sent emails in Gmail-style list layout.
 * Consistent UI with Inbox and Starred pages.
 *
 * @module features/sent/SentView
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { useSentDetailModalStore } from './useSentDetailModalStore'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import { RefreshCw, Mail, CheckCircle } from 'lucide-react'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import type { EmailOutbound } from '../../types'

export default function SentView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { open } = useSentDetailModalStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  const [emails, setEmails] = useState<EmailOutbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Debounce search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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
          status: 'sent',
        })
      }

      if (reset || pageNum === 1) {
        setEmails(result.data)
      } else {
        setEmails(prev => [...prev, ...result.data])
      }

      setHasMore(result.hasMore && pageNum < 10)
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

  // Listen for email-deleted event
  useEffect(() => {
    const handleEmailDeleted = () => {
      fetchEmails(1, debouncedSearch, true)
    }
    window.addEventListener('email-deleted', handleEmailDeleted)
    return () => window.removeEventListener('email-deleted', handleEmailDeleted)
  }, [fetchEmails, debouncedSearch])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchEmails(1, debouncedSearch, true)
    setRefreshing(false)
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEmails(nextPage, debouncedSearch, false)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return

    const result = await confirm({
      title: 'Delete Emails',
      message: `Delete ${selectedIds.size} email${selectedIds.size === 1 ? '' : 's'}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })

    if (!result) return

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => emailOutboundService.softDelete(id))
      )
      setEmails(prev => prev.filter(e => !selectedIds.has(e.id)))
      setSelectedIds(new Set())
      window.dispatchEvent(new Event('email-deleted'))
      showSuccess(`Deleted ${selectedIds.size} email${selectedIds.size === 1 ? '' : 's'}`)
    } catch (error) {
      console.error('Failed to delete emails:', error)
      showError('Failed to delete emails')
    }
  }

  const handleRowClick = (email: EmailOutbound) => {
    open(email)
  }

  const handleToggleSelect = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(emailId)) {
        next.delete(emailId)
      } else {
        next.add(emailId)
      }
      return next
    })
  }

  // Helper functions
  const getInitials = (email: string) => {
    if (!email) return '?'
    const parts = email.split('@')[0]
    return parts.charAt(0).toUpperCase()
  }

  const getAvatarColor = (email: string) => {
    const colors_arr = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9c27b0', '#ff5722', '#00bcd4', '#795548', '#607d8b', '#e91e63']
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = (hash * 31 + email.charCodeAt(i)) % colors_arr.length
    }
    return colors_arr[Math.abs(hash)]
  }

  const formatPreview = (email: EmailOutbound) => {
    const text = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || ''
    return text.slice(0, 80) + (text.length > 80 ? '...' : '')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return 'Yesterday'
    if (days < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' })
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  }

  return (
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

      <div className="min-h-full flex flex-col" style={{ backgroundColor: colors.surface }}>
        {/* Page Header */}
        <div className="flex-shrink-0 border-b px-6 py-4" style={{ borderColor: colors.divider }}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title and stats */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: colors.textPrimary }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  Sent
                  {!loading && emails.length > 0 && (
                    <span
                      className="text-sm font-normal px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: colors.searchBackground,
                        color: colors.textSecondary,
                      }}
                    >
                      {emails.length} {emails.length === 1 ? 'email' : 'emails'}
                    </span>
                  )}
                </h1>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="p-2 rounded-lg transition-all"
                style={{
                  backgroundColor: colors.searchBackground,
                  color: (refreshing || loading) ? colors.textTertiary : colors.textSecondary,
                }}
                title="Refresh sent"
              >
                <RefreshCw
                  size={18}
                  className={refreshing ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>

          {/* Selected items toolbar */}
          {selectedIds.size > 0 && (
            <div
              className="mt-3 px-4 py-3 rounded-lg flex flex-wrap items-center gap-3 transition-all"
              style={{
                backgroundColor: colors.primary + '15',
                border: `1px solid ${colors.primary}30`,
              }}
            >
              <span className="text-sm font-medium" style={{ color: colors.primary }}>
                {selectedIds.size} {selectedIds.size === 1 ? 'email' : 'emails'} selected
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Delete */}
                <button
                  onClick={handleBatchDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                  style={{
                    backgroundColor: '#ef444420',
                    border: `1px solid #ef444440`,
                    color: '#ef4444',
                  }}
                  title="Delete selected"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>

                {/* Clear selection */}
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    color: colors.textSecondary,
                  }}
                  title="Clear selection"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email List */}
        <div className="divide-y flex-1 overflow-y-auto" style={{ borderColor: colors.divider }}>
          {emails.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No sent emails</p>
              <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                Emails you send will appear here
              </p>
            </div>
          ) : (
            emails.map((email) => {
              const recipient = email.recipientEmail
              const initials = getInitials(recipient)
              const avatarColor = getAvatarColor(recipient)
              const preview = formatPreview(email)
              const dateFormatted = formatDate(email.createdAt)
              const isHovered = hoveredRow === email.id
              const isSelected = selectedIds.has(email.id)

              return (
                <div
                  key={email.id}
                  onMouseEnter={() => setHoveredRow(email.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => handleRowClick(email)}
                  className={`
                    flex items-center gap-x-3 px-4 h-[56px] cursor-pointer
                    transition-all duration-150
                    bg-[var(--theme-surface)]
                    hover:bg-[var(--theme-surface-hover)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:z-10 relative
                  `}
                  style={{
                    backgroundColor: colors.surface,
                  }}
                  role="button"
                  aria-label={`Sent to ${recipient}: ${email.subject || '(No subject)'}`}
                >
                  {/* Checkbox - visible on hover or when selected */}
                  <div
                    className={`
                      flex-shrink-0 transition-opacity duration-150
                      ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}
                    `}
                    onClick={(e) => handleToggleSelect(e, email.id)}
                  >
                    <div
                      className={`
                        w-4 h-4 border-2 rounded cursor-pointer
                        flex items-center justify-center
                        transition-colors
                        ${isSelected
                          ? `bg-[${colors.primary}] border-[${colors.primary}]`
                          : `border-[${colors.textTertiary}] bg-transparent hover:border-[${colors.primary}]`
                        }
                      `}
                      style={{
                        borderColor: isSelected ? colors.primary : (isHovered ? colors.primary : colors.textTertiary),
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M1 6l3.5 3.5L11 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex-shrink-0 opacity-50">
                    {email.status === 'sent' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#34a853">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    ) : email.status === 'failed' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#ea4335">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    ) : null}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                    title={recipient}
                  >
                    {initials}
                  </div>

                  {/* Recipient name */}
                  <div
                    className="w-40 md:w-52 flex-shrink-0 truncate"
                    style={{
                      fontSize: '14px',
                      fontWeight: 400,
                      color: colors.textPrimary,
                    }}
                  >
                    {recipient}
                  </div>

                  {/* Subject + Preview */}
                  <div className="flex-1 min-w-0 flex items-center gap-x-2">
                    <span
                      className="truncate"
                      style={{
                        fontSize: '14px',
                        fontWeight: 400,
                        color: colors.textPrimary,
                      }}
                    >
                      {email.subject || '(No subject)'}
                    </span>
                    <span
                      className="truncate"
                      style={{ fontSize: '14px', color: colors.textSecondary }}
                    >
                      — {preview}
                    </span>
                  </div>

                  {/* Date */}
                  <div
                    className="w-20 md:w-24 flex-shrink-0 text-right"
                    style={{
                      fontSize: '12px',
                      color: colors.textSecondary,
                      fontWeight: 400,
                    }}
                  >
                    {dateFormatted}
                  </div>
                </div>
              )
            })
          )}

          {loadingMore && (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading...
            </div>
          )}

          {!loading && hasMore && emails.length > 0 && (
            <div className="p-3 border-t" style={{ borderColor: colors.divider }}>
              <button
                onClick={handleLoadMore}
                className="w-full py-2 text-sm transition-colors rounded-md"
                style={{
                  color: colors.primary,
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
