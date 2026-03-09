/**
 * Sent View Component
 *
 * Displays sent emails in Gmail-style list layout.
 *
 * @module features/sent/SentView
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../contexts/ThemeContext'
import type { EmailOutbound } from '../../types'

export default function SentView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()

  const [emails, setEmails] = useState<EmailOutbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
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

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEmails(nextPage, debouncedSearch, false)
  }

  const handleRowClick = (email: EmailOutbound) => {
    // TODO: Implement sent email detail view
    console.log('Sent email clicked:', email)
  }

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

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'sent') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#34a853">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      )
    } else if (status === 'failed') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ea4335">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      )
    }
    return null
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: colors.surface }}>
      <div className="divide-y" style={{ borderColor: colors.divider }}>
        {emails.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No sent emails</p>
          </div>
        ) : (
          emails.map((email) => {
            const recipient = email.recipientEmail
            const initials = getInitials(recipient)
            const avatarColor = getAvatarColor(recipient)
            const preview = formatPreview(email)
            const dateFormatted = formatDate(email.createdAt)
            const isHovered = hoveredRow === email.id

            return (
              <div
                key={email.id}
                className="flex items-center gap-x-3 px-4 h-[56px] cursor-pointer transition-all duration-150 relative"
                style={{
                  backgroundColor: colors.surface,
                }}
                onMouseEnter={(e) => {
                  setHoveredRow(email.id)
                  e.currentTarget.style.backgroundColor = colors.surfaceHover
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  setHoveredRow(null)
                  e.currentTarget.style.backgroundColor = colors.surface
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => handleRowClick(email)}
                role="button"
                aria-label={`Sent to ${recipient}: ${email.subject || '(No subject)'}`}
              >
                {/* Checkbox - visible on hover */}
                <div
                  className={`
                    flex-shrink-0 transition-opacity duration-150
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                  `}
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

                {/* Status indicator */}
                <div className="flex-shrink-0 opacity-50">
                  <StatusIcon status={email.status} />
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
                    color: '#202124',
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
