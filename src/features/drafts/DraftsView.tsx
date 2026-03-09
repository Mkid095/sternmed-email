/**
 * Drafts View Component
 *
 * Displays draft emails in Gmail-style list layout.
 * Clicking a draft opens it in a compose window for editing.
 *
 * @module features/drafts/DraftsView
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { useComposeStore } from '../../features/compose/useComposeStore'
import { useTheme } from '../../contexts/ThemeContext'
import type { EmailOutbound } from '../../types'

export default function DraftsView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { openCompose } = useComposeStore()
  const { colors } = useTheme()

  const [drafts, setDrafts] = useState<EmailOutbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchDrafts = useCallback(async (pageNum: number, reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const result = await emailOutboundService.getOutboundEmails(emailAliasId, {
        page: pageNum,
        pageSize: 20,
        status: 'pending',
      })

      if (reset || pageNum === 1) {
        setDrafts(result.data)
      } else {
        setDrafts(prev => [...prev, ...result.data])
      }

      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  useEffect(() => {
    setPage(1)
    fetchDrafts(1, true)
  }, [fetchDrafts])

  // Listen for email-deleted event
  useEffect(() => {
    const handleEmailDeleted = () => {
      fetchDrafts(1, true)
    }
    window.addEventListener('email-deleted', handleEmailDeleted)
    return () => window.removeEventListener('email-deleted', handleEmailDeleted)
  }, [fetchDrafts])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchDrafts(nextPage, false)
  }

  const handleRowClick = (draft: EmailOutbound) => {
    // Open compose window with draft data for editing
    openCompose(
      {
        to: [draft.recipientEmail],
        subject: draft.subject,
        body: draft.bodyText || '',
        cc: draft.cc || [],
        bcc: draft.bcc || [],
      },
      undefined,
      draft.id
    )
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

  return (
    <div className="min-h-full bg-white">
      <div className="divide-y divide-[#f1f3f4]">
        {drafts.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No drafts</p>
          </div>
        ) : (
          drafts.map((draft) => {
            const recipient = draft.recipientEmail
            const initials = getInitials(recipient)
            const avatarColor = getAvatarColor(recipient)
            const preview = formatPreview(draft)
            const dateFormatted = formatDate(draft.createdAt)
            const isHovered = hoveredRow === draft.id

            return (
              <div
                key={draft.id}
                onMouseEnter={() => setHoveredRow(draft.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => handleRowClick(draft)}
                className={`
                  flex items-center gap-x-3 px-4 h-[56px] cursor-pointer
                  transition-all duration-150 bg-white
                  hover:bg-[#f2f6fc] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:z-10 relative
                `}
                role="button"
                aria-label={`Draft to ${recipient}: ${draft.subject || '(No subject)'}`}
              >
                {/* Checkbox - visible on hover */}
                <div
                  className={`
                    flex-shrink-0 transition-opacity duration-150
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-4 h-4 border-2 border-[#9aa0a6] rounded bg-transparent hover:border-[#1a73e8] transition-colors" />
                </div>

                {/* Star placeholder (disabled for drafts) */}
                <div className="flex-shrink-0 opacity-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
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
                      color: '#202124',
                    }}
                  >
                    {draft.subject || '(No subject)'}
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

        {!loading && hasMore && drafts.length > 0 && (
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
