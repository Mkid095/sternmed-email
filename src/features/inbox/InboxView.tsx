/**
 * Inbox View Component
 *
 * Gmail-style email list with single column layout.
 * Displays emails with checkbox, star, avatar, sender, subject+preview, date.
 * Checkboxes appear on hover. Unread emails have bold text.
 * Clicking a row opens the email in a modal.
 *
 * @module features/inbox/InboxView
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { useEmailModalStore } from './useEmailModalStore'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import { RefreshCw, Filter, Mail, CheckCircle, Trash2, Star } from 'lucide-react'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import type { EmailInbound } from '../../types'

export default function InboxView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { open } = useEmailModalStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  const [emails, setEmails] = useState<EmailInbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Debounce search
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

      if (reset || pageNum === 1) {
        setEmails(result.data)
      } else {
        setEmails(prev => [...prev, ...result.data])
      }

      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  // Initial fetch
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

  const handleMarkAllRead = async () => {
    const unreadEmails = filteredEmails.filter(e => !e.isRead)
    if (unreadEmails.length === 0) return

    try {
      await Promise.all(
        unreadEmails.map(email => emailInboundService.markAsRead(email.id))
      )
      setEmails(prev => prev.map(e => unreadEmails.find(u => u.id === e.id) ? { ...e, isRead: true } : e))
      showSuccess(`Marked ${unreadEmails.length} email${unreadEmails.length === 1 ? '' : 's'} as read`)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      showError('Failed to mark emails as read')
    }
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
        Array.from(selectedIds).map(id => emailInboundService.softDelete(id))
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

  const handleBatchStar = async (makeStarred: boolean) => {
    if (selectedIds.size === 0) return

    // Only toggle those that actually need changing
    const emailsToUpdate = emails.filter(e => selectedIds.has(e.id) && e.isStarred !== makeStarred)
    if (emailsToUpdate.length === 0) {
      const alreadyState = makeStarred ? 'starred' : 'unstarred'
      showSuccess(`Selected emails are already ${alreadyState}`)
      return
    }

    try {
      await Promise.all(
        emailsToUpdate.map(email => emailInboundService.toggleStarred(email.id))
      )
      setEmails(prev => prev.map(e => emailsToUpdate.find(u => u.id === e.id) ? { ...e, isStarred: makeStarred } : e))
      showSuccess(`${emailsToUpdate.length} email${emailsToUpdate.length === 1 ? '' : 's'} ${makeStarred ? 'starred' : 'unstarred'}`)
    } catch (error) {
      console.error('Failed to update star status:', error)
      showError('Failed to update star status')
    }
  }

  const handleBatchMarkRead = async (markAsRead: boolean) => {
    if (selectedIds.size === 0) return

    const targetEmails = emails.filter(e => selectedIds.has(e.id) && e.isRead !== markAsRead)
    if (targetEmails.length === 0) return

    try {
      await Promise.all(
        targetEmails.map(email =>
          markAsRead ? emailInboundService.markAsRead(email.id) : emailInboundService.markAsUnread(email.id)
        )
      )
      setEmails(prev => prev.map(e => targetEmails.find(t => t.id === e.id) ? { ...e, isRead: markAsRead } : e))
      showSuccess(`${targetEmails.length} email${targetEmails.length === 1 ? '' : 's'} marked as ${markAsRead ? 'read' : 'unread'}`)
    } catch (error) {
      console.error('Failed to mark emails:', error)
      showError('Failed to mark emails')
    }
  }

  // Compute filtered emails based on filter state
  const filteredEmails = emails.filter(email => {
    if (filter === 'unread') return !email.isRead
    if (filter === 'starred') return email.isStarred
    return true
  })

  // Count unread emails
  const unreadCount = emails.filter(e => !e.isRead).length

  const handleRowClick = async (email: EmailInbound) => {
    // Toggle selection if clicked on checkbox area (handled separately)
    // Open email modal
    if (!email.isRead) {
      try {
        await emailInboundService.markAsRead(email.id)
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: true } : e))
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }
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

  const handleToggleStar = async (e: React.MouseEvent, email: EmailInbound) => {
    e.stopPropagation()
    try {
      const newStarred = await emailInboundService.toggleStarred(email.id)
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isStarred: newStarred } : e))
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  // Helper functions
  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const colors = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9c27b0', '#ff5722', '#00bcd4', '#795548', '#607d8b', '#e91e63']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) % colors.length
    }
    return colors[Math.abs(hash)]
  }

  const formatPreview = (email: EmailInbound) => {
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

  // Star icon component
  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? colors.accent : 'none'} stroke={filled ? colors.accent : colors.textTertiary} strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )

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
                <Mail size={22} style={{ color: colors.primary }} />
                Inbox
                {!loading && emails.length > 0 && (
                  <span
                    className="text-sm font-normal px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: colors.searchBackground,
                      color: colors.textSecondary,
                    }}
                  >
                    {filteredEmails.length} {filteredEmails.length === 1 ? 'email' : 'emails'}
                  </span>
                )}
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {unreadCount} unread{unreadCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Filter dropdown */}
            <div className="relative">
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: colors.searchBackground,
                  color: filter !== 'all' ? colors.primary : colors.textSecondary,
                  border: `1px solid ${filter !== 'all' ? colors.primary : colors.border}`,
                }}
                onClick={() => {
                  // Cycle through filters: all -> unread -> starred -> all
                  if (filter === 'all') setFilter('unread')
                  else if (filter === 'unread') setFilter('starred')
                  else setFilter('all')
                }}
              >
                <Filter size={16} />
                <span className="capitalize">{filter === 'all' ? 'All' : filter}</span>
              </button>
            </div>

            {/* Mark all as read */}
            {unreadCount > 0 && selectedIds.size === 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: colors.searchBackground,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                }}
                title="Mark all as read"
              >
                <CheckCircle size={16} />
                <span className="hidden sm:inline">Read</span>
              </button>
            )}

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 rounded-lg transition-all"
              style={{
                backgroundColor: colors.searchBackground,
                color: (refreshing || loading) ? colors.textTertiary : colors.textSecondary,
              }}
              title="Refresh inbox"
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
              {/* Mark as read */}
              <button
                onClick={() => handleBatchMarkRead(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
                title="Mark as read"
              >
                <Mail size={14} />
                <span className="hidden sm:inline">Read</span>
              </button>

              {/* Mark as unread */}
              <button
                onClick={() => handleBatchMarkRead(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
                title="Mark as unread"
              >
                <Mail size={14} style={{ opacity: 0.6 }} />
                <span className="hidden sm:inline">Unread</span>
              </button>

              {/* Star */}
              <button
                onClick={() => handleBatchStar(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                style={{
                  backgroundColor: colors.accent + '20',
                  border: `1px solid ${colors.accent}40`,
                  color: colors.accent,
                }}
                title="Star selected"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
                <span className="hidden sm:inline">Star</span>
              </button>

              {/* Unstar */}
              <button
                onClick={() => handleBatchStar(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
                title="Remove star"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
                <span className="hidden sm:inline">Unstar</span>
              </button>

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
        {filteredEmails.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">
              {filter === 'all'
                ? 'No emails in inbox'
                : filter === 'unread'
                ? 'No unread emails'
                : 'No starred emails'}
            </p>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isUnread = !email.isRead
            const senderName = email.senderName || email.senderEmail.split('@')[0] || 'Unknown'
            const initials = getInitials(senderName)
            const avatarColor = getAvatarColor(senderName)
            const preview = formatPreview(email)
            const dateFormatted = formatDate(email.receivedAt)
            const isHovered = hoveredRow === email.id
            const isSelected = selectedIds.has(email.id)
            const isStarred = email.isStarred

            return (
              <div
                key={email.id}
                onMouseEnter={() => setHoveredRow(email.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => handleRowClick(email)}
                className={`
                  flex items-center gap-x-3 px-4 h-[56px] cursor-pointer
                  transition-all duration-150
                  ${isUnread ? 'bg-[var(--theme-selected)]' : 'bg-[var(--theme-surface)]'}
                  hover:bg-[var(--theme-surface-hover)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:z-10 relative
                `}
                style={{
                  backgroundColor: isUnread ? colors.selected : colors.surface,
                }}
                role="button"
                aria-label={`Email from ${senderName}: ${email.subject || '(No subject)'}`}
              >
                {/* Checkbox - visible on hover */}
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

                {/* Star - always visible if starred, on hover otherwise */}
                <div
                  className={`
                    flex-shrink-0 transition-opacity duration-150 cursor-pointer
                    ${isStarred ? 'opacity-100' : (isHovered ? 'opacity-100' : 'opacity-0')}
                  `}
                  onClick={(e) => handleToggleStar(e, email)}
                >
                  <StarIcon filled={isStarred} />
                </div>

                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                  style={{ backgroundColor: avatarColor }}
                  title={senderName}
                >
                  {initials}
                </div>

                {/* Sender name */}
                <div
                  className="w-40 md:w-52 flex-shrink-0 truncate"
                  style={{
                    fontSize: '14px',
                    fontWeight: isUnread ? 700 : 400,
                    color: colors.textPrimary,
                  }}
                >
                  {senderName}
                </div>

                {/* Subject + Preview */}
                <div className="flex-1 min-w-0 flex items-center gap-x-2">
                  <span
                    className="truncate"
                    style={{
                      fontSize: '14px',
                      fontWeight: isUnread ? 700 : 400,
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
                    fontWeight: isUnread ? 700 : 400,
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
