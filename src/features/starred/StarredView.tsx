/**
 * Starred View Component
 *
 * Displays starred emails in Gmail-style list layout.
 *
 * @module features/starred/StarredView
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { useEmailModalStore } from '../inbox/useEmailModalStore'
import { useTheme } from '../../contexts/ThemeContext'
import type { EmailInbound } from '../../types'

export default function StarredView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { open } = useEmailModalStore()
  const { colors } = useTheme()

  const [emails, setEmails] = useState<EmailInbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchEmails = useCallback(async (pageNum: number, reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const result = await emailInboundService.getInboundEmails(emailAliasId, {
        page: pageNum,
        pageSize: 20,
        starredOnly: true,
      })

      if (reset || pageNum === 1) {
        setEmails(result.data)
      } else {
        setEmails(prev => [...prev, ...result.data])
      }

      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Error fetching starred emails:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  useEffect(() => {
    setPage(1)
    fetchEmails(1, true)
  }, [fetchEmails])

  // Listen for email-deleted event
  useEffect(() => {
    const handleEmailDeleted = () => {
      fetchEmails(1, true)
    }
    window.addEventListener('email-deleted', handleEmailDeleted)
    return () => window.removeEventListener('email-deleted', handleEmailDeleted)
  }, [fetchEmails])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEmails(nextPage, false)
  }

  const handleRowClick = async (email: EmailInbound) => {
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

  const handleToggleStar = async (e: React.MouseEvent, email: EmailInbound) => {
    e.stopPropagation()
    try {
      const newStarred = await emailInboundService.toggleStarred(email.id)
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isStarred: newStarred } : e))
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const colors_arr = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9c27b0', '#ff5722', '#00bcd4', '#795548', '#607d8b', '#e91e63']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) % colors_arr.length
    }
    return colors_arr[Math.abs(hash)]
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

  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? colors.accent : 'none'} stroke={filled ? colors.accent : colors.textTertiary} strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )

  return (
    <div className="min-h-full" style={{ backgroundColor: colors.surface }}>
      <div className="divide-y" style={{ borderColor: colors.divider }}>
        {emails.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No starred emails</p>
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
            const isStarred = email.isStarred

            return (
              <div
                key={email.id}
                className="flex items-center gap-x-3 px-4 h-[56px] cursor-pointer transition-all duration-150 relative"
                style={{
                  backgroundColor: isUnread ? colors.selected : colors.surface,
                }}
                onMouseEnter={(e) => {
                  setHoveredRow(email.id)
                  e.currentTarget.style.backgroundColor = colors.surfaceHover
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  setHoveredRow(null)
                  e.currentTarget.style.backgroundColor = isUnread ? colors.selected : colors.surface
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => handleRowClick(email)}
                role="button"
                aria-label={`Email from ${senderName}: ${email.subject || '(No subject)'}`}
              >
                {/* Checkbox - visible on hover */}
                <div
                  className={`
                    flex-shrink-0 transition-opacity duration-150
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="w-4 h-4 border-2 rounded bg-transparent transition-colors"
                    style={{
                      borderColor: colors.textTertiary,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.primary}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.textTertiary}
                  />
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
          <div className="p-3 border-t border-[#f1f3f4]">
            <button
              onClick={handleLoadMore}
              className="w-full py-2 text-sm rounded-md transition-colors"
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
  )
}
