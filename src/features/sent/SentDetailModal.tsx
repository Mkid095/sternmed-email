/**
 * Sent Email Detail Modal
 *
 * Full-screen modal overlay for viewing a sent email.
 * Displays the complete sent email with Gmail-style toolbar and layout.
 *
 * @module features/sent/SentDetailModal
 */

import { useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Trash2,
  Reply,
  Forward,
  X,
  Printer,
  CheckCircle,
  Mail,
  FileText,
  Download,
} from 'lucide-react'
import { useSentDetailModalStore } from './useSentDetailModalStore'
import SafeHtml from '../../components/ui/SafeHtml'
import { useTheme } from '../../contexts/ThemeContext'
import { useToastSuccess, useToastError } from '../shared/ui'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import type { EmailOutbound } from '../../types'

export default function SentDetailModal({ onReply, onForward, onDelete }: { onReply?: (email: EmailOutbound) => void; onForward?: (email: EmailOutbound) => void; onDelete?: () => void }) {
  const { selectedEmail, isOpen, close } = useSentDetailModalStore()
  const { colors } = useTheme()

  const showSuccess = useToastSuccess()
  const showError = useToastError()

  const handleClose = useCallback(() => {
    close()
  }, [close])

  const handleDelete = useCallback(async () => {
    if (!selectedEmail) return

    try {
      await emailOutboundService.softDelete(selectedEmail.id)
      showSuccess('Email deleted')
      onDelete?.()
      window.dispatchEvent(new Event('email-deleted'))
      handleClose()
    } catch (error) {
      console.error('Failed to delete email:', error)
      showError('Failed to delete email')
    }
  }, [selectedEmail, showSuccess, showError, onDelete, handleClose])

  // Keyboard handler for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

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

  // If modal is not open or no email selected, render nothing
  if (!isOpen || !selectedEmail) {
    return null
  }

  const recipientInitials = getInitials(selectedEmail.recipientEmail)
  const recipientAvatarColor = getAvatarColor(selectedEmail.recipientEmail)
  const statusColor = selectedEmail.status === 'sent' ? '#34a853' : selectedEmail.status === 'failed' ? '#ea4335' : colors.textTertiary

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
        aria-label="Sent email detail"
      >
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: colors.divider, backgroundColor: colors.surface }}>
          {/* Left: Navigation & Actions */}
          <div className="flex items-center gap-0">
            <button
              onClick={handleClose}
              className="p-2 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
              title="Back"
            >
              <ArrowLeft color={colors.textSecondary} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
              title="Delete"
            >
              <Trash2 color={colors.textSecondary} />
            </button>
            <button
              onClick={() => onReply?.(selectedEmail)}
              className="p-2 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
              title="Reply"
            >
              <Reply color={colors.textSecondary} />
            </button>
            <button
              onClick={() => onForward?.(selectedEmail)}
              className="p-2 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
              title="Forward"
            >
              <Forward color={colors.textSecondary} />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
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
              onClick={handleClose}
              className="p-2 rounded-full transition-colors"
              style={{ backgroundColor: 'transparent' }}
              title="Close"
            >
              <X color={colors.textSecondary} />
            </button>
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              {/* Subject */}
              <h1 className="text-[22px] font-normal mb-4" style={{ color: colors.textPrimary }}>
                {selectedEmail.subject || '(No subject)'}
              </h1>

              {/* Recipient Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {/* Recipient Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: recipientAvatarColor }}
                  >
                    <span className="text-white font-medium text-sm">{recipientInitials}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>To: {selectedEmail.recipientEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {formatDate(selectedEmail.createdAt)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                        style={{ color: statusColor, backgroundColor: statusColor + '20' }}
                      >
                        <CheckCircle color={statusColor} />
                        {selectedEmail.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CC/BCC if present */}
              {(selectedEmail.cc || selectedEmail.bcc) && (
                <div className="mb-4 text-sm" style={{ color: colors.textSecondary }}>
                  {selectedEmail.cc && (
                    <div>CC: {selectedEmail.cc.join(', ')}</div>
                  )}
                  {selectedEmail.bcc && (
                    <div>BCC: {selectedEmail.bcc.join(', ')}</div>
                  )}
                </div>
              )}
            </div>

            {/* Email Body */}
            <div className="border-t pt-4" style={{ borderColor: colors.divider }}>
              <div className="text-[15px] leading-relaxed max-w-[580px]" style={{ color: colors.textPrimary }}>
                {selectedEmail.bodyHtml ? (
                  <SafeHtml className="email-body" html={selectedEmail.bodyHtml} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-base">
                    {selectedEmail.bodyText || ''}
                  </pre>
                )}
              </div>

              {/* Attachments */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mt-6 border-t pt-4" style={{ borderColor: colors.divider }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                    Attachments ({selectedEmail.attachments.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedEmail.attachments.map((att: any, idx: number) => (
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
                  onClick={() => onReply?.(selectedEmail)}
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
                  onClick={() => onForward?.(selectedEmail)}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
