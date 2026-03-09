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
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
)

const ArchiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
  </svg>
)

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 13H11v-6l5.25 3.15-.75 1.23-3-1.79V15z"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
)

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
)

const MoveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.53 15.48 1 13.5 3L12 4.5 10.5 3C8.51 1 6 2.53 6 4.64c0 .48.1.92.18 1.36H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7.5-2.5c.28-.31.73-.5 1-.5.83 0 1.5.67 1.5 1.5S14.33 6 13.5 6h-3l1.5-2.5zM9 4.64c0-.83.67-1.5 1.5-1.5.28 0 .72.19 1 .5L13 6h-3C9.45 6 9 5.45 9 4.64zM20 19H4v-9h16v9z"/>
  </svg>
)

const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
  </svg>
)

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#f4b400" : "none"} stroke={filled ? "#f4b400" : "#9aa0a6"} strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
)

const EmojiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
)

const ReplyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#444746">
    <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
  </svg>
)

const ForwardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#444746">
    <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/>
  </svg>
)

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#444746">
    <path d="M7 10l5 5 5-5z"/>
  </svg>
)

const PrintIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
  </svg>
)

const OpenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
  </svg>
)

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
)

/**
 * EmailDetailModal Component
 *
 * Full-screen overlay displaying an email thread with Gmail-style toolbar and actions.
 */
export default function EmailDetailModal({ onReply, onForward, onArchive, onDelete }: EmailDetailModalProps) {
  const { selectedEmail, isOpen, close } = useEmailModalStore()

  const [showAllMessages, setShowAllMessages] = useState(false)
  const [threadEmails, setThreadEmails] = useState<any[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [showToDetails, setShowToDetails] = useState(false)
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0)
  const [totalEmails, setTotalEmails] = useState(0)

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
      setTotalEmails(0)

      if (selectedEmail.threadId && selectedEmail.threadId !== selectedEmail.id) {
        setLoadingThread(true)
        try {
          const fullThread = await emailInboundService.getThread(selectedEmail.threadId)
          const otherEmails = fullThread.filter(e => e.id !== selectedEmail.id)
          setThreadEmails(otherEmails)
          setTotalEmails(otherEmails.length + 1)
        } catch (error) {
          console.error('Failed to fetch thread:', error)
          showError('Failed to load conversation')
        } finally {
          setLoadingThread(false)
        }
      } else {
        setTotalEmails(1)
      }
    }

    fetchThread()
  }, [isOpen, selectedEmail, showError])

  /**
   * Close modal and reset state
   */
  const handleClose = useCallback(() => {
    close()
    setShowAllMessages(false)
    setThreadEmails([])
    setShowToDetails(false)
  }, [close])

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
    if (!selectedEmail) return

    try {
      await emailInboundService.softDelete(selectedEmail.id)
      showSuccess('Email deleted')
      onDelete?.()
      window.dispatchEvent(new Event('email-deleted'))
      handleClose()
    } catch (error) {
      console.error('Failed to delete email:', error)
      showError('Failed to delete email')
    }
  }, [selectedEmail, showSuccess, showError, onDelete, handleClose])

  /**
   * Toggle star status
   */
  const handleToggleStar = useCallback(async () => {
    if (!selectedEmail) return

    try {
      const newStarred = await emailInboundService.toggleStarred(selectedEmail.id)
      showSuccess(newStarred ? 'Starred' : 'Star removed')
    } catch (error) {
      console.error('Failed to toggle star:', error)
      showError('Failed to update star')
    }
  }, [selectedEmail, showSuccess, showError])

  /**
   * Toggle read/unread status
   */
  const handleToggleRead = useCallback(async () => {
    if (!selectedEmail) return

    try {
      if (selectedEmail.isRead) {
        await emailInboundService.markAsUnread(selectedEmail.id)
        showSuccess('Marked as unread')
      } else {
        await emailInboundService.markAsRead(selectedEmail.id)
        showSuccess('Marked as read')
      }
    } catch (error) {
      console.error('Failed to toggle read status:', error)
      showError('Failed to update status')
    }
  }, [selectedEmail, showSuccess, showError])

  /**
   * Reply action - opens compose window
   */
  const handleReply = useCallback(() => {
    if (onReply && selectedEmail) {
      onReply(selectedEmail)
    }
  }, [onReply, selectedEmail])

  /**
   * Forward action - opens compose window
   */
  const handleForward = useCallback(() => {
    if (onForward && selectedEmail) {
      onForward(selectedEmail)
    }
  }, [onForward, selectedEmail])

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

  /**
   * Toolbar button component
   */
  const ToolbarButton = ({
    Icon,
    label,
    onClick,
    active = false,
  }: {
    Icon: React.ElementType
    label: string
    onClick: () => void
    active?: boolean
  }) => (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="p-2 rounded-full hover:bg-[#f1f3f4] transition-colors"
      style={{
        color: active ? '#1a73e8' : '#444746',
      }}
    >
      <Icon />
    </button>
  )

  // If modal is not open, render nothing
  if (!isOpen || !selectedEmail) {
    return null
  }

  const currentEmail = selectedEmail
  const displayEmails = showAllMessages ? [currentEmail, ...threadEmails] : [currentEmail]
  const hasThread = currentEmail.threadId && threadEmails.length > 0
  const currentIndex = 0

  // Extract sender name/email
  const senderName = currentEmail.senderName || 'Unknown'
  const senderEmail = currentEmail.senderEmail
  const senderInitial = senderName.charAt(0).toUpperCase()

  const avatarColor = '#1a73e8' // Use consistent color like Gmail

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
        className="fixed inset-4 md:inset-8 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Email detail"
      >
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#f1f3f4] bg-white">
          {/* Left: Navigation & Actions */}
          <div className="flex items-center gap-0">
            <ToolbarButton Icon={ArrowLeftIcon} label="Back" onClick={handleClose} />
            <ToolbarButton Icon={ArchiveIcon} label="Archive" onClick={handleArchive} />
            <ToolbarButton Icon={ClockIcon} label="Snooze" onClick={handleSnooze} />
            <ToolbarButton Icon={TrashIcon} label="Delete" onClick={handleDelete} />
            <ToolbarButton Icon={MailIcon} label="Mark as unread" onClick={handleToggleRead} active={!currentEmail.isRead} />
            <ToolbarButton Icon={MoveIcon} label="Move to" onClick={handleMove} />
            <ToolbarButton Icon={DotsIcon} label="More options" onClick={() => {}} />
          </div>

          {/* Right: Pagination & Actions */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#444746] mr-2">
              {currentEmailIndex + 1} of {totalEmails}
            </span>
            <ToolbarButton Icon={ChevronLeftIcon} label="Older" onClick={() => {}} />
            <ToolbarButton Icon={ChevronRightIcon} label="Newer" onClick={() => {}} />
            <button
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 10px', borderRadius: 4, display: 'flex',
                alignItems: 'center', gap: 4
              }}
              className="hover:bg-[#f1f3f4] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#444746">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <ChevronDownIcon />
            </button>
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Subject + Action Buttons */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-[22px] font-normal text-[#202124] flex-1">
                {currentEmail.subject || '(No subject)'}
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#444746] bg-[#f1f3f4] rounded-full cursor-pointer hover:bg-[#e8eaed]">
                  Inbox
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#9aa0a6">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </span>
                <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors" title="Print">
                  <PrintIcon />
                </button>
                <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors" title="Open in new window">
                  <OpenIcon />
                </button>
              </div>
            </div>

            {/* Sender Info */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                {/* Avatar with Supabase-style placeholder */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#e8eaed' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#9aa0a6">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#202124]">{senderEmail}</span>
                  </div>
                  <button
                    onClick={() => setShowToDetails(s => !s)}
                    className="flex items-center gap-1 text-sm text-[#5f6368] hover:underline bg-none border-none cursor-pointer p-0"
                  >
                    <span>to me</span>
                    <ChevronDownIcon />
                  </button>

                  {showToDetails && (
                    <div className="mt-2 text-xs text-[#5f6368] bg-[#f8f9fa] p-3 rounded-lg" style={{ lineHeight: 1.8 }}>
                      <div><strong>from:</strong> {senderEmail}</div>
                      <div><strong>to:</strong> sternmedafrika1@gmail.com</div>
                      <div><strong>date:</strong> {formatDate(currentEmail.receivedAt)}</div>
                      <div><strong>subject:</strong> {currentEmail.subject || '(No subject)'}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-[#5f6368] mr-2">
                  {formatDate(currentEmail.receivedAt)}
                </span>
                <button
                  onClick={handleToggleStar}
                  className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors"
                  title={currentEmail.isStarred ? 'Remove star' : 'Add star'}
                >
                  <StarIcon filled={currentEmail.isStarred} />
                </button>
                <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors" title="Emoji reaction">
                  <EmojiIcon />
                </button>
                <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors" onClick={handleReply} title="Reply">
                  <ReplyIcon />
                </button>
                <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors" onClick={handleForward} title="Forward">
                  <ForwardIcon />
                </button>
                <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors" title="More">
                  <MenuIcon />
                </button>
              </div>
            </div>

            {/* Email Body */}
            <div className="pl-14">
              {/* Supabase logo placeholder */}
              <div className="mb-7">
                <svg width="36" height="36" viewBox="0 0 24 24">
                  <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.199 12.768.718 13.81 1.638 13.81H12.92l.027 9.156c.015.986 1.26 1.41 1.874.637l9.262-11.653c.565-.718.046-1.76-.874-1.76H11.927l-.027-9.154z" fill="#3ECF8E"/>
                </svg>
              </div>

              <div className="text-[15px] text-[#202124] leading-relaxed max-w-[580px]">
                {currentEmail.bodyHtml ? (
                  <div
                    className="email-body"
                    dangerouslySetInnerHTML={{ __html: currentEmail.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-base">
                    {currentEmail.bodyText || ''}
                  </pre>
                )}
              </div>

              {/* Attachments */}
              {currentEmail.attachments && currentEmail.attachments.length > 0 && (
                <div className="mt-6 border-t border-[#f1f3f4] pt-4">
                  <h3 className="text-sm font-medium text-[#444746] mb-3">
                    Attachments ({currentEmail.attachments.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {currentEmail.attachments.map((att: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-lg border border-[#f1f3f4]"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-blue-600"
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
                          <p className="text-sm font-medium text-[#202124] truncate">
                            {att.filename}
                          </p>
                          <p className="text-xs text-[#5f6368]">
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        {att.url && (
                          <a
                            href={att.url}
                            download={att.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#1a73e8] hover:underline flex-shrink-0"
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#dadce0] rounded-full text-sm font-medium text-[#202124] hover:bg-[#f6f8fc] hover:shadow-sm transition-all"
                >
                  <ReplyIcon />
                  Reply
                </button>
                <button
                  onClick={handleForward}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#dadce0] rounded-full text-sm font-medium text-[#202124] hover:bg-[#f6f8fc] hover:shadow-sm transition-all"
                >
                  <ForwardIcon />
                  Forward
                </button>
                <button
                  className="p-2.5 border border-[#dadce0] rounded-full hover:bg-[#f6f8fc] transition-colors"
                  title="Add emoji reaction"
                >
                  <EmojiIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
