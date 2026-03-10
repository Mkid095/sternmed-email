/**
 * ============================================================================
 * COMPOSE VIEW
 * ============================================================================
 * 
 * A full-page view for composing emails. This component provides a spacious,
 * focused environment for writing emails with all the features of the modal
 * but in a dedicated page layout.
 * 
 * Features:
 * - Full-page layout for focused email composition
 * - Recipient management with chip-style tags
 * - Collapsible CC/BCC fields
 * - Subject line with validation
 * - Large text area for message body
 * - File attachments with size validation
 * - Draft auto-save functionality
 * - Reply-to support (via URL parameter)
 * - Draft editing (via sessionStorage)
 * 
 * Navigation:
 * - Access via /compose route
 * - Reply mode: /compose?reply=<emailId>
 * - Edit draft: Set sessionStorage 'editDraft' before navigating
 * 
 * @module features/compose/ComposeView
 * @author Sternmed Email Team
 * @version 2.0.0
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Send,           // Send button icon
  Trash2,         // Discard button icon
  Paperclip,      // Attachment icon
  Save,           // Save draft icon
  ArrowLeft,      // Back navigation icon
  FileText,       // File type icon
  Mail,           // Email icon
  User,           // User icon for recipients
  X,              // Close/remove icon
  Sparkles,       // Decorative icon
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Attachment file structure
 */
interface ComposeAttachment {
  id: string              // Unique identifier
  name: string            // Original filename
  size: number            // File size in bytes
  type: string            // MIME type
  file: File              // The actual File object
  cloudinaryUrl?: string  // URL after upload (if already uploaded)
  uploading?: boolean     // Upload in progress flag
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
 * ComposeView Component
 * 
 * A full-page email composition interface with:
 * - Spacious layout for focused writing
 * - All recipient fields (To, CC, BCC)
 * - File attachments
 * - Draft auto-save
 * - Reply and draft editing support
 */
export default function ComposeView() {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  /** Navigation hooks */
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const replyToId = searchParams.get('reply')

  /** Authentication store */
  const { emailAliasId, user } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  // ------------------------------------------------------------------------
  // Form State
  // ------------------------------------------------------------------------
  
  /** Recipient lists */
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  
  /** Email content */
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  
  /** Attachments */
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])
  
  /** UI State */
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
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

  // ========================================================================
  // EFFECTS
  // ========================================================================

  /**
   * Load draft data from sessionStorage (for editing existing drafts)
   */
  useEffect(() => {
    const editDraftData = sessionStorage.getItem('editDraft')
    if (editDraftData) {
      try {
        const draft = JSON.parse(editDraftData)
        setTo(draft.recipientEmail ? [draft.recipientEmail] : [])
        setCc(draft.cc || [])
        setBcc(draft.bcc || [])
        setSubject(draft.subject || '')
        setBody(draft.bodyText || draft.bodyHtml?.replace(/<br>/g, '\n') || '')
        setDraftId(draft.id)
        sessionStorage.removeItem('editDraft')
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [])

  /**
   * Load email for reply when replyToId is in URL
   */
  useEffect(() => {
    if (replyToId && emailAliasId) {
      const loadReplyTo = async () => {
        try {
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
   * Handles file selection from input
   * Validates file size constraints
   */
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newAttachments: ComposeAttachment[] = []
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
    const confirmed = await confirm({
      title: 'Send Email',
      message: `Are you sure you want to send this email to ${to.join(', ')}?`,
      confirmLabel: 'Send',
      variant: 'info',
    })

    if (!confirmed) return

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

      // Reset form and navigate away
      setTo([])
      setCc([])
      setBcc([])
      setSubject('')
      setBody('')
      setAttachments([])
      setDraftId(null)

      alert('Email sent successfully!')
      navigate('/sent')
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setSending(false)
    }
  }, [emailAliasId, to, subject, attachments, cc, bcc, body, draftId, confirm, navigate])

  // ========================================================================
  // DISCARD HANDLING
  // ========================================================================

  /**
   * Handles discarding the email with confirmation
   */
  const handleDiscard = useCallback(async () => {
    const result = await confirm({
      title: 'Discard Message',
      message: 'Are you sure you want to discard this email? Any unsaved changes will be lost.',
      confirmLabel: 'Discard',
      variant: 'danger',
    })

    if (result) {
      // Delete draft if exists
      if (draftId) {
        await emailOutboundService.softDelete(draftId)
      }
      navigate(-1)
    }
  }, [draftId, confirm, navigate])

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
    <div className="flex items-start gap-4">
      {/* Label */}
      <label 
        className="text-sm font-medium pt-2.5 min-w-[80px] flex-shrink-0"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </label>
      
      {/* Input container with chips */}
      <div 
        className={`flex-1 flex flex-wrap gap-1.5 p-2.5 rounded-xl transition-all min-h-[46px] ${
          focusedField === fieldName ? 'ring-2' : ''
        }`}
        style={{ 
          backgroundColor: colors.surface,
          border: `1px solid ${focusedField === fieldName ? colors.primary : colors.border}`,
          boxShadow: focusedField === fieldName ? `0 0 0 3px ${colors.primary}20` : undefined
        }}
      >
        {/* Recipient chips */}
        {recipients.map((recipient, idx) => (
          <span
            key={idx}
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
          className="flex-1 min-w-[200px] bg-transparent outline-none text-sm"
          style={{ color: colors.textPrimary }}
        />
      </div>
    </div>
  )

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.background }}
    >
      {/* ================================================================
          HEADER
          ================================================================ */}
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary}10, ${colors.primary}05)`,
          borderBottom: `1px solid ${colors.divider}` 
        }}
      >
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl transition-all hover:bg-black/5"
            style={{ color: colors.textSecondary }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: colors.primary + '15' }}
            >
              <Sparkles size={20} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 
                className="text-xl font-bold"
                style={{ color: colors.textPrimary }}
              >
                {draftId ? 'Edit Draft' : 'New Email'}
              </h1>
              <p 
                className="text-sm"
                style={{ color: colors.textSecondary }}
              >
                From: {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Discard button */}
        <button
          onClick={handleDiscard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-50 hover:text-red-600"
          style={{ color: colors.textSecondary }}
        >
          <Trash2 size={16} />
          Discard
        </button>
      </header>

      {/* ================================================================
          FORM CONTENT
          ================================================================ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {/* Recipients Section */}
          <div className="space-y-4">
            {/* To Field with CC/BCC toggles */}
            <div className="flex items-start gap-4">
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
              <div className="flex gap-2 pt-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className={`text-xs px-3 py-2 rounded-lg font-medium transition-all ${
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
                  className={`text-xs px-3 py-2 rounded-lg font-medium transition-all ${
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
            <div className="flex items-center gap-4">
              <label 
                className="text-sm font-medium min-w-[80px] flex-shrink-0"
                style={{ color: colors.textSecondary }}
              >
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="flex-1 px-4 py-3 rounded-xl outline-none text-sm transition-all"
                style={{
                  backgroundColor: colors.surface,
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
          <div className="flex flex-col gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={14}
              className="w-full px-4 py-3 rounded-xl outline-none resize-none text-sm leading-relaxed transition-all"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${focusedField === 'body' ? colors.primary : colors.border}`,
                color: colors.textPrimary,
                boxShadow: focusedField === 'body' ? `0 0 0 3px ${colors.primary}20` : undefined
              }}
              onFocus={() => setFocusedField('body')}
              onBlur={() => setFocusedField(null)}
            />
            <p 
              className="text-xs px-1"
              style={{ color: colors.textTertiary }}
            >
              Supports plain text. Use *bold* or - lists for simple formatting.
            </p>
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="space-y-3">
              <label 
                className="text-sm font-medium"
                style={{ color: colors.textSecondary }}
              >
                Attachments ({attachments.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl group"
                    style={{ 
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <FileText size={16} style={{ color: colors.primary }} />
                    <span 
                      className="text-sm truncate max-w-[180px]"
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
                      type="button"
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
        </div>
      </div>

      {/* ================================================================
          FOOTER ACTIONS
          ================================================================ */}
      <footer
        className="px-6 py-4 flex items-center justify-between border-t"
        style={{ 
          borderColor: colors.divider,
          backgroundColor: colors.surface
        }}
      >
        {/* Left: Status */}
        <div className="flex items-center gap-4">
          <p 
            className="text-sm"
            style={{ color: colors.textTertiary }}
          >
            {savingDraft ? 'Saving draft...' : draftId && !savingDraft ? 'Draft saved' : ''}
          </p>
        </div>

        {/* Right: Action buttons */}
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105"
            style={{
              backgroundColor: colors.surfaceHover,
              color: colors.textSecondary,
            }}
          >
            <Paperclip size={16} />
            Attach
          </button>

          {/* Save draft button */}
          <button
            type="button"
            onClick={autosaveDraft}
            disabled={savingDraft || !subject}
            className="px-4 py-2.5 text-sm rounded-xl transition-all inline-flex items-center gap-2 disabled:opacity-50 hover:scale-105"
            style={{
              backgroundColor: colors.surfaceHover,
              color: colors.textSecondary,
            }}
          >
            <Save size={16} />
            Save Draft
          </button>
          
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || to.length === 0 || !subject}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105"
            style={{ backgroundColor: colors.primary }}
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </footer>

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
    </div>
  )
}
