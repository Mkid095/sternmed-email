/**
 * Email Detail Modal
 *
 * Full-screen modal overlay for viewing an email thread.
 * Displays all messages in the thread with Gmail-style toolbar and layout.
 *
 * @module features/inbox/EmailDetailModal
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Archive,
  Clock,
  Trash2,
  Mail,
  Move,
  MoreHorizontal,
  Star,
  Smile,
  Reply,
  Forward,
  ChevronLeft,
  ChevronRight,
  X,
  Printer,
  ExternalLink,
  MoreVertical,
  ChevronDown,
  FileText,
  Download,
} from 'lucide-react'
import { useEmailModalStore } from './useEmailModalStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useToastSuccess, useToastError } from '../shared/ui'
import { useTheme } from '../../contexts/ThemeContext'
import type { EmailInbound } from '../../types'

/**
 * EmailDetailModal Props
 */
interface EmailDetailModalProps {
  /** Callback for reply action - receives the email being replied to */
  onReply?: (email: any) => void
  /** Callback for forward action - receives the email being forwarded */
  onForward?: (email: any) => void
  /** Callback when archive action is performed */
  onArchive?: () => void
  /** Callback when delete action is performed */
  onDelete?: () => void
}

/**
 * EmailDetailModal Component
 *
 * Full-screen overlay displaying an email thread with Gmail-style toolbar and actions.
 */
export default function EmailDetailModal({ onReply, onForward, onArchive, onDelete }: EmailDetailModalProps) {
  const { selectedEmail, isOpen, close } = useEmailModalStore()
  const { colors } = useTheme()

  const [showAllMessages, setShowAllMessages] = useState(false)
  const [threadEmails, setThreadEmails] = useState<any[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [showToDetails, setShowToDetails] = useState(false)
  const [activeEmail, setActiveEmail] = useState<EmailInbound | null>(null)
  const [displayMode, setDisplayMode] = useState<'single' | 'all'>('single')

  const showSuccess = useToastSuccess()
  const showError = useToastError()

  // Track current request to cancel stale ones
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  const pendingRequestIdRef = useRef<string | null>(null)
  const lastFetchTimeRef = useRef<number>(0)
  const DEBOUNCE_MS = 100

  // Thread cache: threadId -> { data, timestamp }
  const threadCacheRef = useRef<Map<string, { emails: any[]; timestamp: number }>>(new Map())
  const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Fetch full thread when modal opens
   */
  useEffect(() => {
    isMountedRef.current = true

    const fetchThread = async () => {
      if (!isOpen || !selectedEmail) {
        return
      }

      // Debounce: prevent rapid successive calls
      const now = Date.now()
      if (now - lastFetchTimeRef.current < DEBOUNCE_MS) {
        return
      }
      lastFetchTimeRef.current = now

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new AbortController for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Generate a unique request ID to handle race conditions
      const requestId = crypto.randomUUID()
      pendingRequestIdRef.current = requestId

      setShowAllMessages(false)
      setActiveEmail(selectedEmail)

      // Check cache first if we have a threadId
      if (selectedEmail.threadId && selectedEmail.threadId !== selectedEmail.id) {
        const cached = threadCacheRef.current.get(selectedEmail.threadId)
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
          // Use cached data
          const sorted = cached.emails.sort((a, b) =>
            new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
          )
          const otherEmails = sorted.filter(e => e.id !== selectedEmail.id)
          setThreadEmails(otherEmails)
          setLoadingThread(false)
          return
        }

        setLoadingThread(true)

        try {
          // Check if this request is still the latest one
          if (pendingRequestIdRef.current !== requestId) {
            return
          }

          // Add a small delay to further reduce rapid requests
          await new Promise((resolve, reject) => {
            if (abortControllerRef.current?.signal.aborted) {
              reject(new DOMException('Aborted', 'AbortError'))
            } else {
              setTimeout(resolve, 10)
            }
          })

          const fullThread = await emailInboundService.getThread(selectedEmail.threadId)

          // Cache the result
          threadCacheRef.current.set(selectedEmail.threadId, {
            emails: fullThread,
            timestamp: Date.now(),
          })

          // Only update state if this is still the latest request and component is mounted
          if (isMountedRef.current && pendingRequestIdRef.current === requestId) {
            // Sort by received_at ascending (earliest first)
            const sorted = fullThread.sort((a, b) =>
              new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
            )
            const otherEmails = sorted.filter(e => e.id !== selectedEmail.id)
            setThreadEmails(otherEmails)
          }
        } catch (error: any) {
          // Ignore abort errors - they're expected when canceling
          if (error.name === 'AbortError' || error.message === 'Aborted') {
            return
          }
          console.error('Failed to fetch thread:', error)
          if (isMountedRef.current && pendingRequestIdRef.current === requestId) {
            showError('Failed to load conversation')
          }
        } finally {
          if (isMountedRef.current && pendingRequestIdRef.current === requestId) {
            setLoadingThread(false)
          }
        }
      } else {
        // No thread needed, just set the single email
        setThreadEmails([])
        setLoadingThread(false)
      }
    }

    // Debounce slightly to prevent rapid successive calls
    const timeoutId = setTimeout(fetchThread, 50)

    return () => {
      isMountedRef.current = false
      clearTimeout(timeoutId)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isOpen, selectedEmail, showError])

  // Compute all emails in thread (chronological order)
  const allThreadEmails = activeEmail
    ? [activeEmail, ...threadEmails].sort((a, b) =>
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      )
    : []

  const activeEmailIndex = activeEmail
    ? allThreadEmails.findIndex(e => e.id === activeEmail.id)
    : -1

  /**
   * Close modal and reset state
   */
  const handleClose = useCallback(() => {
    close()
    setShowAllMessages(false)
    setDisplayMode('single')
    setThreadEmails([])
    setShowToDetails(false)
  }, [close])

  /**
   * Toggle between single view and all messages
   */
  const handleToggleView = () => {
    if (displayMode === 'single') {
      setDisplayMode('all')
      setShowAllMessages(true)
    } else {
      setDisplayMode('single')
      setShowAllMessages(false)
    }
  }

  /**
   * Navigate to next email in thread (newer)
   */
  const handleNextEmail = () => {
    if (!activeEmail) return
    const currentIdx = allThreadEmails.findIndex(e => e.id === activeEmail.id)
    if (currentIdx < allThreadEmails.length - 1) {
      setActiveEmail(allThreadEmails[currentIdx + 1])
    }
  }

  /**
   * Navigate to previous email in thread (older)
   */
  const handlePrevEmail = () => {
    if (!activeEmail) return
    const currentIdx = allThreadEmails.findIndex(e => e.id === activeEmail.id)
    if (currentIdx > 0) {
      setActiveEmail(allThreadEmails[currentIdx - 1])
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  /**
   * Delete action
   */
  const handleDelete = useCallback(async () => {
    if (!activeEmail) return

    try {
      await emailInboundService.softDelete(activeEmail.id)
      showSuccess('Email deleted')
      onDelete?.()
      window.dispatchEvent(new Event('email-deleted'))
      handleClose()
    } catch (error) {
      console.error('Failed to delete email:', error)
      showError('Failed to delete email')
    }
  }, [activeEmail, showSuccess, showError, onDelete, handleClose])

  // Clear thread cache on unmount or when appropriate
  useEffect(() => {
    return () => {
      // Optionally clear cache on unmount - but keep it for session reuse
      // threadCacheRef.current.clear()
    }
  }, [])

  /**
   * Toggle star status
   */
  const handleToggleStar = useCallback(async () => {
    if (!activeEmail) return

    try {
      const newStarred = await emailInboundService.toggleStarred(activeEmail.id)
      showSuccess(newStarred ? 'Starred' : 'Star removed')
      // Update local state
      setActiveEmail(prev => prev ? { ...prev, isStarred: newStarred } : null)
      setThreadEmails(prev => prev.map(e => e.id === activeEmail.id ? { ...e, isStarred: newStarred } : e))
    } catch (error) {
      console.error('Failed to toggle star:', error)
      showError('Failed to update star')
    }
  }, [activeEmail, showSuccess, showError])

  /**
   * Toggle read/unread status
   */
  const handleToggleRead = useCallback(async () => {
    if (!activeEmail) return

    try {
      if (activeEmail.isRead) {
        await emailInboundService.markAsUnread(activeEmail.id)
        showSuccess('Marked as unread')
      } else {
        await emailInboundService.markAsRead(activeEmail.id)
        showSuccess('Marked as read')
      }
      // Update local state
      setActiveEmail(prev => prev ? { ...prev, isRead: !prev.isRead } : null)
      setThreadEmails(prev => prev.map(e => e.id === activeEmail.id ? { ...e, isRead: !activeEmail.isRead } : e))
    } catch (error) {
      console.error('Failed to toggle read status:', error)
      showError('Failed to update status')
    }
  }, [activeEmail, showSuccess, showError])

  /**
   * Reply action - opens compose window
   */
  const handleReply = useCallback(() => {
    if (onReply && activeEmail) {
      onReply(activeEmail)
    }
  }, [onReply, activeEmail])

  /**
   * Forward action - opens compose window
   */
  const handleForward = useCallback(() => {
    if (onForward && activeEmail) {
      onForward(activeEmail)
    }
  }, [onForward, activeEmail])

  const handleArchive = useCallback(async () => {
    showSuccess('Archive feature coming soon')
    onArchive?.()
  }, [showSuccess, onArchive])

  const handleMove = useCallback(() => {
    showSuccess('Move to folder feature coming soon')
  }, [showSuccess])

  const handleSnooze = useCallback(() => {
    showSuccess('Snooze feature coming soon')
  }, [showSuccess])

  const handleMoreOptions = useCallback(() => {
    showSuccess('More options coming soon')
  }, [showSuccess])

  /**
   * Toolbar button component
   */
  const ToolbarButton = ({
    Icon,
    label,
    onClick,
    active = false,
    disabled = false,
  }: {
    Icon: React.ElementType
    label: string
    onClick: () => void
    active?: boolean
    disabled?: boolean
  }) => (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className="p-2 rounded-full transition-colors"
      style={{
        color: disabled ? colors.textTertiary : (active ? colors.primary : colors.textSecondary),
        backgroundColor: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = colors.divider)}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Icon color={disabled ? colors.textTertiary : (active ? colors.primary : colors.textSecondary)} />
    </button>
  )

  // If modal is not open, render nothing
  if (!isOpen || !activeEmail) {
    return null
  }

  const displayEmails = showAllMessages ? allThreadEmails : [activeEmail]
  const hasThread = activeEmail.threadId && threadEmails.length > 0

  // Extract sender name/email from active email
  const senderName = activeEmail.senderName || 'Unknown'
  const senderEmail = activeEmail.senderEmail

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className="fixed inset-4 md:inset-8 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.surface }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Email detail"
      >
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: colors.divider, backgroundColor: colors.surface }}>
          {/* Left: Navigation & Actions */}
          <div className="flex items-center gap-0">
            <ToolbarButton Icon={ArrowLeft} label="Back" onClick={handleClose} />
            <ToolbarButton Icon={Archive} label="Archive" onClick={handleArchive} />
            <ToolbarButton Icon={Clock} label="Snooze" onClick={handleSnooze} />
            <ToolbarButton Icon={Trash2} label="Delete" onClick={handleDelete} />
            <ToolbarButton Icon={Mail} label="Mark as unread" onClick={handleToggleRead} active={!activeEmail.isRead} />
            <ToolbarButton Icon={Move} label="Move to" onClick={handleMove} />
            <ToolbarButton Icon={MoreHorizontal} label="More options" onClick={handleMoreOptions} />
          </div>

          {/* Right: Pagination & Actions */}
          <div className="flex items-center gap-1">
            <span className="text-xs mr-2" style={{ color: colors.textTertiary }}>
              {activeEmailIndex + 1} of {allThreadEmails.length}
            </span>
            <ToolbarButton
              Icon={ChevronLeft}
              label="Older"
              onClick={handlePrevEmail}
              active={activeEmailIndex > 0}
              disabled={activeEmailIndex <= 0}
            />
            <ToolbarButton
              Icon={ChevronRight}
              label="Newer"
              onClick={handleNextEmail}
              active={activeEmailIndex < allThreadEmails.length - 1}
              disabled={activeEmailIndex >= allThreadEmails.length - 1}
            />
            <ToolbarButton
              Icon={MoreHorizontal}
              label={showAllMessages ? 'Single view' : 'Show all'}
              onClick={handleToggleView}
              active={showAllMessages}
            />
            <ToolbarButton Icon={X} label="Close" onClick={handleClose} />
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Single email view or all messages */}
            {displayEmails.map((email, idx) => {
              const isActive = email.id === activeEmail.id
              const senderName = email.senderName || email.senderEmail.split('@')[0] || 'Unknown'
              const senderEmail = email.senderEmail

              return (
                <div key={email.id} className={idx > 0 ? 'mt-8 pt-8 border-t' : ''} style={{ borderColor: colors.divider }}>
                  {/* Subject + Action Buttons (only for active email) */}
                  {isActive && (
                    <>
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <h1 className="text-[22px] font-normal flex-1" style={{ color: colors.textPrimary }}>
                          {email.subject || '(No subject)'}
                        </h1>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full cursor-pointer"
                            style={{
                              color: colors.textSecondary,
                              backgroundColor: colors.divider,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                          >
                            Inbox
                            <svg width="10" height="10" viewBox="0 0 24 24" fill={colors.textTertiary}>
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                          </span>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Print"
                          >
                            <Printer color={colors.textSecondary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Open in new window"
                          >
                            <ExternalLink color={colors.textSecondary} />
                          </button>
                        </div>
                      </div>

                      {/* Sender Info */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: colors.surfaceHover }}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill={colors.textTertiary}>
                              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                            </svg>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>{senderEmail}</span>
                            </div>
                            <button
                              onClick={() => setShowToDetails(s => !s)}
                              className="flex items-center gap-1 text-sm hover:underline bg-none border-none cursor-pointer p-0"
                              style={{ color: colors.textSecondary }}
                            >
                              <span>to me</span>
                              <ChevronDown color={colors.textSecondary} />
                            </button>

                            {showToDetails && (
                              <div className="mt-2 text-xs p-3 rounded-lg" style={{ lineHeight: 1.8, backgroundColor: colors.selected, color: colors.textSecondary }}>
                                <div><strong>from:</strong> {senderEmail}</div>
                                <div><strong>to:</strong> {email.recipientEmail || 'Unknown recipient'}</div>
                                <div><strong>date:</strong> {formatDate(email.receivedAt)}</div>
                                <div><strong>subject:</strong> {email.subject || '(No subject)'}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs mr-2" style={{ color: colors.textSecondary }}>
                            {formatDate(email.receivedAt)}
                          </span>
                          <button
                            onClick={handleToggleStar}
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title={email.isStarred ? 'Remove star' : 'Add star'}
                          >
                            <Star size={20} fill={email.isStarred ? colors.accent : "none"} color={email.isStarred ? colors.accent : colors.textTertiary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Emoji reaction"
                          >
                            <Smile color={colors.textTertiary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleReply}
                            title="Reply"
                          >
                            <Reply color={colors.textSecondary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleForward}
                            title="Forward"
                          >
                            <Forward color={colors.textSecondary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="More"
                          >
                            <MoreVertical color={colors.textSecondary} />
                          </button>
                        </div>
                      </div>

                      {/* Email Body */}
                      <div className="pl-14">
                        <div className="text-[15px] leading-relaxed max-w-[580px]" style={{ color: colors.textPrimary }}>
                          {email.bodyHtml ? (
                            <div
                              className="email-body"
                              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans text-base">
                              {email.bodyText || ''}
                            </pre>
                          )}
                        </div>

                        {/* Attachments */}
                        {email.attachments && email.attachments.length > 0 && (
                          <div className="mt-6 border-t pt-4" style={{ borderColor: colors.divider }}>
                            <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                              Attachments ({email.attachments.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {email.attachments.map((att: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-3 rounded-lg border"
                                  style={{
                                    backgroundColor: colors.searchBackground,
                                    borderColor: colors.divider,
                                  }}
                                >
                                  <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.primary + '20' }}>
                                    <FileText color={colors.primary} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary }}>
                                      {att.filename}
                                    </p>
                                    <p className="text-xs" style={{ color: colors.textTertiary }}>
                                      {(att.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  {att.url && (
                                    <a
                                      href={att.url}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm flex-shrink-0 flex items-center"
                                      style={{ color: colors.primary }}
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </a>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                    )}
                      </div>

                      {/* Reply/Forward Bar */}
                      <div className="mt-8 pt-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleReply}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                            style={{
                              backgroundColor: colors.surface,
                              border: `1px solid ${colors.divider}`,
                              color: colors.textPrimary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.surfaceHover
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = colors.surface
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <Reply color={colors.primary} />
                            Reply
                          </button>
                          <button
                            onClick={handleForward}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                            style={{
                              backgroundColor: colors.surface,
                              border: `1px solid ${colors.divider}`,
                              color: colors.textPrimary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.surfaceHover
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = colors.surface
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <Forward color={colors.primary} />
                            Forward
                          </button>
                          <button
                            className="p-2.5 border rounded-full transition-colors"
                            style={{
                              borderColor: colors.divider,
                              backgroundColor: colors.surface,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.surface}
                            title="Add emoji reaction"
                          >
                            <Smile color={colors.textTertiary} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Non-active email (in "show all" mode) - simplified view */}
                  {!isActive && (
                    <div className="py-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0"
                          style={{ backgroundColor: colors.primary + '80' }}
                        >
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                            {senderName}
                          </p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {senderEmail}
                          </p>
                        </div>
                        <span className="text-xs" style={{ color: colors.textTertiary }}>
                          {formatDate(email.receivedAt)}
                        </span>
                      </div>
                      <div className="pl-11">
                        <div className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                          {email.bodyText?.substring(0, 150)}...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
