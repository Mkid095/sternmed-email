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
import type { EmailInbound } from '../../types'

export default function InboxView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { open } = useEmailModalStore()
  const { colors } = useTheme()

  const [emails, setEmails] = useState<EmailInbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

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

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEmails(nextPage, debouncedSearch, false)
  }

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#f4b400' : 'none'} stroke={filled ? '#f4b400' : '#9aa0a6'} strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )

  return (
    <div className="min-h-full bg-white">
      <div className="divide-y divide-[#f1f3f4]">
        {emails.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No emails in inbox</p>
          </div>
        ) : (
          emails.map((email) => {
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
                  ${isUnread ? 'bg-[#f8f9fa]' : 'bg-white'}
                  hover:bg-[#f2f6fc] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:z-10 relative
                `}
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
                        ? 'bg-[#1a73e8] border-[#1a73e8]'
                        : 'border-[#9aa0a6] bg-transparent hover:border-[#1a73e8]'
                      }
                    `}
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
                    color: '#202124',
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
                      color: '#202124',
                    }}
                  >
                    {email.subject || '(No subject)'}
                  </span>
                  <span
                    className="truncate"
                    style={{ fontSize: '14px', color: '#5f6368' }}
                  >
                    — {preview}
                  </span>
                </div>

                {/* Date */}
                <div
                  className="w-20 md:w-24 flex-shrink-0 text-right"
                  style={{
                    fontSize: '12px',
                    color: '#5f6368',
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
          <div className="p-3 border-t border-[#f1f3f4]">
            <button
              onClick={handleLoadMore}
              className="w-full py-2 text-sm text-[#1a73e8] hover:bg-[#f2f6fc] rounded-md transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
