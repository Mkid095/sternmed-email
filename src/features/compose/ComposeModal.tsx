/**
 * ============================================================================
 * COMPOSE MODAL
 * ============================================================================
 * 
 * A modal dialog for composing emails. This component provides a clean,
 * user-friendly interface for writing and sending emails with features like:
 * 
 * Features:
 * - Recipient management with chip-style tags
 * - CC/BCC toggle fields
 * - Subject line with validation
 * - Rich text body area
 * - File attachments with drag & drop support
 * - Draft auto-save functionality
 * - Minimize/expand window
 * - Form validation before send
 * 
 * The modal can be used in two modes:
 * 1. New email composition
 * 2. Reply to existing email (via replyToId prop)
 * 
 * @module features/compose/ComposeModal
 * @author Sternmed Email Team
 * @version 2.0.0
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  X,              // Close icon
  Paperclip,      // Attachment icon
  Send,           // Send button icon
  Save,           // Save draft icon
  Minimize2,      // Minimize icon
  Maximize2,      // Expand icon
  FileText,       // File type icon
  Mail,           // Email icon
  User,           // User icon for recipients
  ChevronDown,    // Expand/collapse indicator
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Props for the ComposeModal component
 */
interface ComposeModalProps {
  isOpen: boolean           // Whether the modal is visible
  onClose: () => void       // Callback when modal is closed
  replyToId?: string        // ID of email being replied to (optional)
  initialData?: {           // Pre-filled data (for drafts/replies)
    to?: string[]
    cc?: string[]
    bcc?: string[]
    subject?: string
    body?: string
  }
}

/**
 * Attachment file structure
 */
interface Attachment {
  id: string              // Unique identifier
  name: string            // Original filename
  size: number            // File size in bytes
  type: string            // MIME type
  file: File              // The actual File object
  cloudinaryUrl?: string  // URL after upload (if already uploaded)
}

/**
 * Form field names for focus tracking
 */
type FormField = 'to' | 'cc' | 'bcc' | 'subject' | 'body' | null

// ============================================================================
// CONSTANTS
// ============================================================================

/** File upload constraints */
const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,      // 10MB per file
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,    // 100MB total
} as const

/** Modal dimensions */
const MODAL_DIMENSIONS = {
  WIDTH_EXPANDED: 680,
  WIDTH_MINIMIZED: 400,
  HEIGHT_EXPANDED: 580,
} as const

/** Auto-save delay in milliseconds */
const AUTOSAVE_DELAY = 2000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats file size to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Validates an email address format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ComposeModal Component
 * 
 * A full-featured email composition modal with:
 * - Chip-style recipient tags
 * - Collapsible CC/BCC fields
 * - File attachments
 * - Draft auto-save
 * - Minimize/expand functionality
 * 
 * @param props - Component props
 */
export default function ComposeModal({ 
  isOpen, 
  onClose, 
  replyToId, 
  initialData 
}: ComposeModalProps) {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  /** Authentication store */
  const { emailAliasId, user } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  // ------------------------------------------------------------------------
  // Form State
  // ------------------------------------------------------------------------
  
  /** Recipient lists */
  const [to, setTo] = useState<string[]>(initialData?.to || [])
  const [cc, setCc] = useState<string[]>(initialData?.cc || [])
  const [bcc, setBcc] = useState<string[]>(initialData?.bcc || [])
  
  /** Email content */
  const [subject, setSubject] = useState(initialData?.subject || '')
  const [body, setBody] = useState(initialData?.body || '')
  
  /** Attachments */
  const [attachments, setAttachments] = useState<Attachment[]>([])
  
  /** UI State */
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [focusedField, setFocusedField] = useState<FormField>(null)
  
  /** Input values for recipient fields (for typing before adding) */
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  
  /** Loading states */
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)

  // ------------------------------------------------------------------------
  // Refs
  // ------------------------------------------------------------------------
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

  // ========================================================================
  // EFFECTS
  // ========================================================================

  /**
   * Load email for reply when replyToId is provided
   */
  useEffect(() => {
    if (replyToId && emailAliasId) {
      const loadReplyTo = async () => {
        try {
          const { emailInboundService } = await import('../../services/supabase/email-inbound.service')
          const email = await emailInboundService.getEmailById(replyToId)
          
          if (email) {
            setTo([email.senderEmail])
            setSubject(`Re: ${email.subject || ''}`)
            
            // Format quoted reply
            const replyBody = `\n\n${'─'.repeat(50)}\n` +
              `From: ${email.senderName || email.senderEmail}\n` +
              `Date: ${new Date(email.receivedAt).toLocaleString()}\n` +
              `${'─'.repeat(50)}\n\n${email.bodyText || ''}`
            setBody(replyBody)
          }
        } catch (error) {
          console.error('Error loading email to reply to:', error)
        }
      }
      loadReplyTo()
    }
  }, [replyToId, emailAliasId])

  /**
   * Auto-save draft when content changes
   */
  useEffect(() => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    // Only auto-save if there's content
    if (subject || body) {
      autosaveTimerRef.current = setTimeout(autosaveDraft, AUTOSAVE_DELAY)
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [to, cc, bcc, subject, body, attachments])

  // ========================================================================
  // RECIPIENT MANAGEMENT
  // ========================================================================

  /**
   * Adds a recipient to the specified list
   * Validates email format before adding
   */
  const addRecipient = useCallback((
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = value.trim()
    
    // Validate email format
    if (trimmed && isValidEmail(trimmed) && !list.includes(trimmed)) {
      setList([...list, trimmed])
      setInput('')
    }
  }, [])

  /**
   * Handles keyboard events in recipient input fields
   * Supports: Enter, comma, semicolon to add; Backspace to remove last
   */
  const handleRecipientKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      addRecipient(value, list, setList, setInput)
    } else if (e.key === 'Backspace' && !value && list.length > 0) {
      // Remove last recipient on backspace when input is empty
      setList(list.slice(0, -1))
    }
  }, [addRecipient])

  /**
   * Removes a recipient from the list
   */
  const removeRecipient = useCallback((
    email: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(list.filter(r => r !== email))
  }, [])

  // ========================================================================
  // FILE HANDLING
  // ========================================================================

  /**
   * Handles file selection from input or drag-drop
   * Validates file size constraints
   */
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newAttachments: Attachment[] = []
    let totalSize = attachments.reduce((sum, att) => sum + att.size, 0)

    for (const file of Array.from(files)) {
      // Check individual file size
      if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
        alert(`File "${file.name}" exceeds 10MB limit`)
        continue
      }

      // Check total size
      if (totalSize + file.size > FILE_CONSTRAINTS.MAX_TOTAL_SIZE) {
        alert('Total attachment size exceeds 100MB limit')
        break
      }

      newAttachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      })
      totalSize += file.size
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments])
    }
  }, [attachments])

  /**
   * Removes an attachment from the list
   */
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  // ========================================================================
  // DRAFT MANAGEMENT
  // ========================================================================

  /**
   * Auto-saves the current email as a draft
   * Called automatically after content changes
   */
  const autosaveDraft = useCallback(async () => {
    if (!emailAliasId || (!subject && !body)) return

    setSavingDraft(true)

    try {
      // Upload new attachments
      const uploadedAttachments = await Promise.all(
        attachments
          .filter(a => !a.cloudinaryUrl)
          .map(async (attachment) => {
            const url = await storageService.uploadFile(attachment.file, 'email_attachments')
            return {
              filename: attachment.name,
              url,
              type: attachment.type,
              size: attachment.size,
            }
          })
      )

      // Combine existing and new attachments
      const allAttachments = [
        ...attachments
          .filter(a => a.cloudinaryUrl)
          .map(a => ({
            filename: a.name,
            url: a.cloudinaryUrl!,
            type: a.type,
            size: a.size,
          })),
        ...uploadedAttachments,
      ]

      const draftData = {
        recipientEmail: to[0] || '',
        cc,
        bcc,
        subject,
        bodyText: body,
        bodyHtml: body.replace(/\n/g, '<br>'),
        attachments: allAttachments,
      }

      if (draftId) {
        await emailOutboundService.saveAsDraft(emailAliasId, draftData)
      } else {
        const draft = await emailOutboundService.saveAsDraft(emailAliasId, draftData)
        setDraftId(draft.id)
      }
    } catch (error) {
      console.error('Error autosaving draft:', error)
    } finally {
      setSavingDraft(false)
    }
  }, [emailAliasId, subject, body, attachments, to, cc, bcc, draftId])

  // ========================================================================
  // SEND EMAIL
  // ========================================================================

  /**
   * Validates and sends the email
   * Shows confirmation dialog before sending
   */
  const handleSend = useCallback(async () => {
    // Validation checks
    if (!emailAliasId) {
      alert('No email alias configured')
      return
    }

    if (to.length === 0) {
      alert('Please enter at least one recipient')
      return
    }

    if (!subject.trim()) {
      alert('Please enter a subject')
      return
    }

    // Confirm before sending
    const result = await confirm({
      title: 'Send Email',
      message: `Send this email to ${to.join(', ')}?`,
      confirmLabel: 'Send',
      variant: 'info',
    })

    if (!result) return

    setSending(true)

    try {
      // Upload any new attachments
      const existing = attachments
        .filter(a => a.cloudinaryUrl)
        .map(a => ({
          filename: a.name,
          url: a.cloudinaryUrl!,
          type: a.type,
          size: a.size,
        }))

      const toUpload = attachments.filter(a => !a.cloudinaryUrl)
      const uploaded = await Promise.all(
        toUpload.map(async (attachment) => {
          const url = await storageService.uploadFile(attachment.file, 'email_attachments')
          return {
            filename: attachment.name,
            url,
            type: attachment.type,
            size: attachment.size,
          }
        })
      )

      const allAttachments = [...existing, ...uploaded]

      // Send the email
      await emailOutboundService.sendEmail(emailAliasId, {
        aliasId: emailAliasId,
        recipientEmail: to[0],
        cc,
        bcc,
        subject,
        bodyText: body,
        bodyHtml: body.replace(/\n/g, '<br>'),
        attachments: allAttachments,
      })

      // Delete draft if exists
      if (draftId) {
        await emailOutboundService.softDelete(draftId)
      }

      // Reset and close
      resetForm()
      onClose()
      alert('Email sent successfully!')
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setSending(false)
    }
  }, [emailAliasId, to, subject, attachments, cc, bcc, body, draftId, confirm, onClose])

  // ========================================================================
  // FORM MANAGEMENT
  // ========================================================================

  /**
   * Resets all form fields to initial state
   */
  const resetForm = useCallback(() => {
    setTo([])
    setCc([])
    setBcc([])
    setSubject('')
    setBody('')
    setAttachments([])
    setDraftId(null)
    setIsMinimized(false)
    setToInput('')
    setCcInput('')
    setBccInput('')
  }, [])

  /**
   * Handles modal close with unsaved changes check
   */
  const handleClose = useCallback(async () => {
    if (subject || body || attachments.length > 0) {
      const result = await confirm({
        title: 'Close Email',
        message: 'You have unsaved changes. Close anyway?',
        confirmLabel: 'Close',
        variant: 'warning',
      })
      if (!result) return
    }
    resetForm()
    onClose()
  }, [subject, body, attachments, confirm, resetForm, onClose])

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  /**
   * Renders a recipient input field with chips
   */
  const renderRecipientField = (
    label: string,
    recipients: string[],
    setRecipients: React.Dispatch<React.SetStateAction<string[]>>,
    inputValue: string,
    setInputValue: React.Dispatch<React.SetStateAction<string>>,
    placeholder: string,
    fieldName: FormField
  ) => (
    <div className="flex items-start gap-3">
      {/* Label */}
      <label 
        className="text-sm font-medium pt-2.5 min-w-[50px] flex-shrink-0"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </label>
      
      {/* Input container with chips */}
      <div 
        className={`flex-1 flex flex-wrap gap-1.5 p-2 rounded-xl transition-all min-h-[42px] ${
          focusedField === fieldName ? 'ring-2' : ''
        }`}
        style={{ 
          backgroundColor: colors.surfaceHover,
          border: `1px solid ${focusedField === fieldName ? colors.primary : colors.border}`,
          boxShadow: focusedField === fieldName ? `0 0 0 3px ${colors.primary}20` : undefined
        }}
      >
        {/* Recipient chips */}
        {recipients.map((recipient) => (
          <span
            key={recipient}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium transition-all hover:shadow-sm"
            style={{ 
              backgroundColor: colors.primary + '15', 
              color: colors.primary 
            }}
          >
            <User size={12} />
            {recipient}
            <button
              type="button"
              onClick={() => removeRecipient(recipient, recipients, setRecipients)}
              className="ml-1 hover:opacity-70 transition-opacity"
              aria-label={`Remove ${recipient}`}
            >
              ×
            </button>
          </span>
        ))}
        
        {/* Text input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => handleRecipientKeyDown(e, inputValue, recipients, setRecipients, setInputValue)}
          onBlur={() => {
            addRecipient(inputValue, recipients, setRecipients, setInputValue)
            setFocusedField(null)
          }}
          onFocus={() => setFocusedField(fieldName)}
          placeholder={recipients.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[150px] bg-transparent outline-none text-sm"
          style={{ color: colors.textPrimary }}
        />
      </div>
    </div>
  )

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  /** Don't render if modal is closed */
  if (!isOpen) return null

  return (
    <>
      {/* Confirmation Modal */}
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

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        {/* Modal Container */}
        <div
          className="flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in zoom-in-95"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            width: isMinimized ? MODAL_DIMENSIONS.WIDTH_MINIMIZED : MODAL_DIMENSIONS.WIDTH_EXPANDED,
            height: isMinimized ? 'auto' : MODAL_DIMENSIONS.HEIGHT_EXPANDED,
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-modal-title"
        >
          {/* ============================================================
              HEADER
              ============================================================ */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary}12, ${colors.primary}05)`,
              borderBottom: `1px solid ${colors.divider}` 
            }}
          >
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.primary + '15' }}
              >
                <Mail size={18} style={{ color: colors.primary }} />
              </div>
              <div>
                <h2 
                  id="compose-modal-title"
                  className="font-semibold text-base"
                  style={{ color: colors.textPrimary }}
                >
                  {draftId ? 'Edit Draft' : 'New Message'}
                </h2>
                <p className="text-xs" style={{ color: colors.textTertiary }}>
                  From: {user?.email}
                </p>
              </div>
            </div>

            {/* Right: Window controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 rounded-lg transition-all hover:bg-black/5"
                style={{ color: colors.textSecondary }}
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand window' : 'Minimize window'}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg transition-all hover:bg-red-50 hover:text-red-500"
                style={{ color: colors.textSecondary }}
                aria-label="Close window"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ============================================================
              FORM CONTENT (Hidden when minimized)
              ============================================================ */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Recipients Section */}
              <div className="px-5 pt-4 space-y-3">
                {/* To Field with CC/BCC toggles */}
                <div className="flex items-start gap-3">
                  {renderRecipientField(
                    'To',
                    to,
                    setTo,
                    toInput,
                    setToInput,
                    'recipient@email.com',
                    'to'
                  )}
                  
                  {/* CC/BCC Toggle Buttons */}
                  <div className="flex gap-1 pt-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCc(!showCc)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                        showCc ? 'shadow-sm' : ''
                      }`}
                      style={{ 
                        color: showCc ? colors.primary : colors.textTertiary,
                        backgroundColor: showCc ? colors.primary + '15' : colors.surfaceHover
                      }}
                    >
                      Cc
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBcc(!showBcc)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                        showBcc ? 'shadow-sm' : ''
                      }`}
                      style={{ 
                        color: showBcc ? colors.primary : colors.textTertiary,
                        backgroundColor: showBcc ? colors.primary + '15' : colors.surfaceHover
                      }}
                    >
                      Bcc
                    </button>
                  </div>
                </div>

                {/* CC Field (Collapsible) */}
                {showCc && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    {renderRecipientField(
                      'Cc',
                      cc,
                      setCc,
                      ccInput,
                      setCcInput,
                      'cc@email.com',
                      'cc'
                    )}
                  </div>
                )}

                {/* BCC Field (Collapsible) */}
                {showBcc && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    {renderRecipientField(
                      'Bcc',
                      bcc,
                      setBcc,
                      bccInput,
                      setBccInput,
                      'bcc@email.com',
                      'bcc'
                    )}
                  </div>
                )}

                {/* Subject Field */}
                <div className="flex items-center gap-3">
                  <label 
                    className="text-sm font-medium min-w-[50px] flex-shrink-0"
                    style={{ color: colors.textSecondary }}
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                    className="flex-1 px-4 py-2.5 rounded-xl outline-none text-sm transition-all"
                    style={{
                      backgroundColor: colors.surfaceHover,
                      border: `1px solid ${focusedField === 'subject' ? colors.primary : colors.border}`,
                      color: colors.textPrimary,
                      boxShadow: focusedField === 'subject' ? `0 0 0 3px ${colors.primary}20` : undefined
                    }}
                    onFocus={() => setFocusedField('subject')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Body Section */}
              <div className="flex-1 px-5 py-3 overflow-hidden">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full h-full px-4 py-3 rounded-xl resize-none outline-none text-sm leading-relaxed transition-all"
                  style={{
                    backgroundColor: colors.surfaceHover,
                    border: `1px solid ${focusedField === 'body' ? colors.primary : colors.border}`,
                    color: colors.textPrimary,
                    boxShadow: focusedField === 'body' ? `0 0 0 3px ${colors.primary}20` : undefined
                  }}
                  onFocus={() => setFocusedField('body')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>

              {/* Attachments Section */}
              {attachments.length > 0 && (
                <div 
                  className="px-5 py-2.5 border-t"
                  style={{ borderColor: colors.divider }}
                >
                  <div 
                    className="text-xs font-medium mb-2 uppercase tracking-wide"
                    style={{ color: colors.textTertiary }}
                  >
                    Attachments ({attachments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm group"
                        style={{ 
                          backgroundColor: colors.surfaceHover,
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        <FileText size={14} style={{ color: colors.primary }} />
                        <span 
                          className="truncate max-w-[120px]"
                          style={{ color: colors.textPrimary }}
                        >
                          {attachment.name}
                        </span>
                        <span 
                          className="text-xs"
                          style={{ color: colors.textTertiary }}
                        >
                          ({formatFileSize(attachment.size)})
                        </span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="opacity-50 hover:opacity-100 transition-opacity"
                          style={{ color: colors.textSecondary }}
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div
                className="flex items-center justify-between px-5 py-3 border-t"
                style={{ 
                  borderColor: colors.divider,
                  backgroundColor: colors.background
                }}
              >
                {/* Left: Status + Attach */}
                <div className="flex items-center gap-3">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />

                  {/* Attach button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl transition-all hover:scale-105"
                    style={{ 
                      color: colors.textSecondary,
                      backgroundColor: colors.surfaceHover
                    }}
                    title="Attach files"
                    aria-label="Attach files"
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Save draft button */}
                  <button
                    type="button"
                    onClick={autosaveDraft}
                    disabled={savingDraft || !subject}
                    className="px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                    style={{ 
                      color: colors.textSecondary,
                      backgroundColor: colors.surfaceHover
                    }}
                  >
                    <Save size={14} />
                    <span>Save</span>
                  </button>

                  {/* Status text */}
                  <div className="text-xs" style={{ color: colors.textTertiary }}>
                    {savingDraft && 'Saving...'}
                    {draftId && !savingDraft && 'Draft saved'}
                  </div>
                </div>

                {/* Right: Send button */}
                <button
                  onClick={handleSend}
                  disabled={sending || to.length === 0 || !subject}
                  className="px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105"
                  style={{
                    backgroundColor: sending || to.length === 0 || !subject 
                      ? colors.textTertiary 
                      : colors.primary,
                    color: 'white',
                  }}
                >
                  <Send size={16} />
                  <span>{sending ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
