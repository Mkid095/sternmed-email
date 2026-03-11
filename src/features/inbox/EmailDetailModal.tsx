/**
 * Email Detail Modal
 *
 * Full-screen modal overlay for viewing an email thread.
 * Displays all messages in the thread with Gmail-style toolbar and layout.
 *
 * @module features/inbox/EmailDetailModal
 */

import { useEffect, useState, useCallback } from 'react'
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

// Icon components (inline SVGs matching Gmail style)
const ArrowLeftIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)

const ArchiveIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
)

const ClockIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
)

const TrashIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
)

const MailIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const MoveIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="5,9 2,12 5,15"/>
    <polyline points="9,5 12,2 15,5"/>
    <polyline points="15,19 12,22 9,19"/>
    <polyline points="19,9 22,12 19,15"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="12" y1="2" x2="12" y2="22"/>
  </svg>
)

const DotsIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
  </svg>
)

const StarIcon = ({ filled, color }: { filled: boolean; color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
)

const EmojiIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
)

const ReplyIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="9,14 4,9 9,4"/>
    <path d="M20 20v-5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/>
  </svg>
)

const ForwardIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="15,14 20,9 15,4"/>
    <path d="M4 20v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/>
  </svg>
)

const ChevronLeftIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
)

const ChevronRightIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
)

const CloseIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const PrintIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="6,9 6,2 18,2 18,9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
)

const OpenIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15,3 21,3 21,9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)

const MenuIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="1"/>
    <circle cx="12" cy="5" r="1"/>
    <circle cx="12" cy="19" r="1"/>
  </svg>
)

const ChevronDownIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M7 10l5 5 5-5z"/>
  </svg>
)


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

  const showSuccess = useToastSuccess()
  const showError = useToastError()

  /**
   * Fetch full thread when modal opens
   */
  useEffect(() => {
    const fetchThread = async () => {
      if (!isOpen || !selectedEmail) {
        return
      }

      setShowAllMessages(false)
      setThreadEmails([])
      setActiveEmail(selectedEmail)

      if (selectedEmail.threadId && selectedEmail.threadId !== selectedEmail.id) {
        setLoadingThread(true)
        try {
          const fullThread = await emailInboundService.getThread(selectedEmail.threadId)
          // Sort by received_at ascending (earliest first)
          const sorted = fullThread.sort((a, b) =>
            new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
          )
          const otherEmails = sorted.filter(e => e.id !== selectedEmail.id)
          setThreadEmails(otherEmails)
        } catch (error) {
          console.error('Failed to fetch thread:', error)
          showError('Failed to load conversation')
        } finally {
          setLoadingThread(false)
        }
      }
    }

    fetchThread()
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
   * Navigate to next email in thread (newer)
   */
  const handleNextEmail = () => {
    if (activeEmailIndex < allThreadEmails.length - 1) {
      setActiveEmail(allThreadEmails[activeEmailIndex + 1])
    }
  }

  /**
   * Navigate to previous email in thread (older)
   */
  const handlePrevEmail = () => {
    if (activeEmailIndex > 0) {
      setActiveEmail(allThreadEmails[activeEmailIndex - 1])
    }
  }

  /**
   * Toggle between single email view and full thread view
   */
  const handleToggleView = () => {
    setShowAllMessages(prev => !prev)
  }

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
    const currentIdx = allThreadEmails.findIndex(e => e.id === activeEmail.id)
    if (currentIdx < allThreadEmails.length - 1) {
      setActiveEmail(allThreadEmails[currentIdx + 1])
    }
  }

  /**
   * Navigate to previous email in thread (older)
   */
  const handlePrevEmail = () => {
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
            <ToolbarButton Icon={ArrowLeftIcon} label="Back" onClick={handleClose} />
            <ToolbarButton Icon={ArchiveIcon} label="Archive" onClick={handleArchive} />
            <ToolbarButton Icon={ClockIcon} label="Snooze" onClick={handleSnooze} />
            <ToolbarButton Icon={TrashIcon} label="Delete" onClick={handleDelete} />
            <ToolbarButton Icon={MailIcon} label="Mark as unread" onClick={handleToggleRead} active={!activeEmail.isRead} />
            <ToolbarButton Icon={MoveIcon} label="Move to" onClick={handleMove} />
            <ToolbarButton Icon={DotsIcon} label="More options" onClick={handleMoreOptions} />
          </div>

          {/* Right: Pagination & Actions */}
          <div className="flex items-center gap-1">
            <span className="text-xs mr-2" style={{ color: colors.textTertiary }}>
              {activeEmailIndex + 1} of {allThreadEmails.length}
            </span>
            <ToolbarButton
              Icon={ChevronLeftIcon}
              label="Older"
              onClick={handlePrevEmail}
              active={activeEmailIndex > 0}
              disabled={activeEmailIndex <= 0}
            />
            <ToolbarButton
              Icon={ChevronRightIcon}
              label="Newer"
              onClick={handleNextEmail}
              active={activeEmailIndex < allThreadEmails.length - 1}
              disabled={activeEmailIndex >= allThreadEmails.length - 1}
            />
            <ToolbarButton
              Icon={DotsIcon}
              label={showAllMessages ? 'Single view' : 'Show all'}
              onClick={handleToggleView}
              active={showAllMessages}
            />
            <ToolbarButton Icon={CloseIcon} label="Close" onClick={handleClose} />
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
                            <PrintIcon color={colors.textSecondary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Open in new window"
                          >
                            <OpenIcon color={colors.textSecondary} />
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
                              <ChevronDownIcon color={colors.textSecondary} />
                            </button>

                            {showToDetails && (
                              <div className="mt-2 text-xs p-3 rounded-lg" style={{ lineHeight: 1.8, backgroundColor: colors.selected, color: colors.textSecondary }}>
                                <div><strong>from:</strong> {senderEmail}</div>
                                <div><strong>to:</strong> sternmedafrika1@gmail.com</div>
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
                            <StarIcon filled={email.isStarred} color={email.isStarred ? colors.accent : colors.textTertiary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Emoji reaction"
                          >
                            <EmojiIcon color={colors.textTertiary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleReply}
                            title="Reply"
                          >
                            <ReplyIcon color={colors.textSecondary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleForward}
                            title="Forward"
                          >
                            <ForwardIcon color={colors.textSecondary} />
                          </button>
                          <button
                            className="p-2 rounded-full transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="More"
                          >
                            <MenuIcon color={colors.textSecondary} />
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
                                    <svg
                                      className="w-5 h-5"
                                      style={{ color: colors.primary }}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01-.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
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
                                      className="text-sm flex-shrink-0"
                                      style={{ color: colors.primary }}
                                    >
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
                            <ReplyIcon color={colors.primary} />
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
                            <ForwardIcon color={colors.primary} />
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
                            <EmojiIcon color={colors.textTertiary} />
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
