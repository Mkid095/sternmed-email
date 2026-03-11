/**
 * ============================================================================
 * COMPOSE MODAL
 * ============================================================================
 * 
 * A modal dialog for composing emails with a clean, Gmail-inspired design.
 * 
 * Features:
 * - Recipient management with chip-style tags
 * - CC/BCC toggle fields
 * - Subject line with validation
 * - Text body area
 * - File attachments
 * - Draft auto-save
 * - Minimize/expand window
 * - Full dark mode support
 * 
 * @module features/compose/ComposeModal
 * @version 2.1.0
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  X,
  Paperclip,
  Send,
  Save,
  Minimize2,
  Maximize2,
  FileText,
  User,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import { useTemplateStore, TEMPLATE_VARIABLES } from '../../features/settings/useTemplateStore'

// ============================================================================
// TYPES
// ============================================================================

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  replyToId?: string
  initialData?: {
    to?: string[]
    cc?: string[]
    bcc?: string[]
    subject?: string
    body?: string
  }
}

interface Attachment {
  id: string
  name: string
  size: number
  type: string
  file: File
  cloudinaryUrl?: string
}

type FormField = 'to' | 'cc' | 'bcc' | 'subject' | 'body' | null

// ============================================================================
// CONSTANTS
// ============================================================================

const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
} as const

const MODAL_DIMENSIONS = {
  WIDTH_EXPANDED: 640,
  WIDTH_MINIMIZED: 380,
  HEIGHT_EXPANDED: 540,
} as const

const AUTOSAVE_DELAY = 2000

// ============================================================================
// HELPERS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Convert plain text to simple HTML with line breaks
 */
function plainToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

/**
 * Get default placeholder values for templates
 */
function getDefaultTemplateVariables(userEmail?: string): Record<string, string> {
  const now = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return {
    COMPANY_NAME: 'Sternmed Afrika',
    COMPANY_ADDRESS: 'P.O. Box [Your P.O. Box], Nairobi, Kenya',
    COMPANY_PHONE: '+254 700 000 000',
    COMPANY_EMAIL: 'info@sternmedafrika.com',
    WEBSITE: 'https://sternmedafrika.com',
    CURRENT_DATE: now,
    CUSTOMER_NAME: '',
    CUSTOMER_EMAIL: userEmail || '',
    CONTENT: '',
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ComposeModal({ 
  isOpen, 
  onClose, 
  replyToId, 
  initialData 
}: ComposeModalProps) {
  // ========================================================================
  // STATE
  // ========================================================================
  
  const { emailAliasId, user } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  // Form state
  const [to, setTo] = useState<string[]>(initialData?.to || [])
  const [cc, setCc] = useState<string[]>(initialData?.cc || [])
  const [bcc, setBcc] = useState<string[]>(initialData?.bcc || [])
  const [subject, setSubject] = useState(initialData?.subject || '')
  const [body, setBody] = useState(initialData?.body || '')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  
  // UI state
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [focusedField, setFocusedField] = useState<FormField>(null)
  
  // Input values
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  
  // Loading states
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)

  // Template selection
  const { templates, getTemplate } = useTemplateStore()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    () => templates.find(t => t.isDefault)?.id || templates[0]?.id || 'standard-email'
  )

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Load reply email
  useEffect(() => {
    if (replyToId && emailAliasId) {
      const loadReplyTo = async () => {
        try {
          const { emailInboundService } = await import('../../services/supabase/email-inbound.service')
          const email = await emailInboundService.getEmailById(replyToId)
          
          if (email) {
            setTo([email.senderEmail])
            setSubject(`Re: ${email.subject || ''}`)
            const replyBody = `\n\n${'─'.repeat(40)}\nFrom: ${email.senderName || email.senderEmail}\nDate: ${new Date(email.receivedAt).toLocaleString()}\n${'─'.repeat(40)}\n\n${email.bodyText || ''}`
            setBody(replyBody)
          }
        } catch (error) {
          console.error('Error loading email to reply to:', error)
        }
      }
      loadReplyTo()
    }
  }, [replyToId, emailAliasId])

  // Auto-save
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

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
  // RECIPIENT HANDLERS
  // ========================================================================

  const addRecipient = useCallback((
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = value.trim()
    if (trimmed && isValidEmail(trimmed) && !list.includes(trimmed)) {
      setList([...list, trimmed])
      setInput('')
    }
  }, [])

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
      setList(list.slice(0, -1))
    }
  }, [addRecipient])

  const removeRecipient = useCallback((
    email: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(list.filter(r => r !== email))
  }, [])

  // ========================================================================
  // FILE HANDLERS
  // ========================================================================

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newAttachments: Attachment[] = []
    let totalSize = attachments.reduce((sum, att) => sum + att.size, 0)

    for (const file of Array.from(files)) {
      if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
        showError(`File "${file.name}" exceeds 10MB limit`)
        continue
      }

      if (totalSize + file.size > FILE_CONSTRAINTS.MAX_TOTAL_SIZE) {
        showError('Total attachment size exceeds 100MB limit')
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
  }, [attachments, showError])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  // ========================================================================
  // DRAFT & SEND HANDLERS
  // ========================================================================

  const autosaveDraft = useCallback(async () => {
    if (!emailAliasId || (!subject && !body)) return

    setSavingDraft(true)

    try {
      const uploadedAttachments = await Promise.all(
        attachments
          .filter(a => !a.cloudinaryUrl)
          .map(async (attachment) => {
            const url = await storageService.uploadFile(attachment.file, 'email_attachments')
            return { filename: attachment.name, url, type: attachment.type, size: attachment.size }
          })
      )

      const allAttachments = [
        ...attachments.filter(a => a.cloudinaryUrl).map(a => ({
          filename: a.name, url: a.cloudinaryUrl!, type: a.type, size: a.size,
        })),
        ...uploadedAttachments,
      ]

      const draftData = {
        recipientEmail: to[0] || '',
        cc, bcc, subject,
        bodyText: body,
        bodyHtml: body.replace(/\n/g, '<br>'), // Simple HTML for draft preview
        attachments: allAttachments,
        templateId: selectedTemplateId,
      }

      if (draftId) {
        await emailOutboundService.saveAsDraft(emailAliasId, draftData)
      } else {
        const draft = await emailOutboundService.saveAsDraft(emailAliasId, draftData)
        setDraftId(draft.id)
      }
    } catch (error) {
      console.error('Error autosaving draft:', error)
      showError('Failed to save draft')
    } finally {
      setSavingDraft(false)
    }
  }, [emailAliasId, subject, body, attachments, to, cc, bcc, draftId, showError, selectedTemplateId])

  const handleSend = useCallback(async () => {
    if (!emailAliasId) {
      showError('No email alias configured')
      return
    }

    if (to.length === 0) {
      showError('Please enter at least one recipient')
      return
    }

    if (!subject.trim()) {
      showError('Please enter a subject')
      return
    }

    const result = await confirm({
      title: 'Send Email',
      message: `Send this email to ${to.join(', ')}?`,
      confirmLabel: 'Send',
      variant: 'info',
    })

    if (!result) return

    setSending(true)

    try {
      const existing = attachments.filter(a => a.cloudinaryUrl).map(a => ({
        filename: a.name, url: a.cloudinaryUrl!, type: a.type, size: a.size,
      }))

      const toUpload = attachments.filter(a => !a.cloudinaryUrl)
      const uploaded = await Promise.all(
        toUpload.map(async (attachment) => {
          const url = await storageService.uploadFile(attachment.file, 'email_attachments')
          return { filename: attachment.name, url, type: attachment.type, size: attachment.size }
        })
      )

      const allAttachments = [...existing, ...uploaded]

      // Get selected template and apply it
      const template = getTemplate(selectedTemplateId)
      let finalBodyHtml: string
      let finalBodyText: string

      if (template) {
        // Prepare variables with defaults
        const defaultVars = getDefaultTemplateVariables(user?.email)
        const contentHtml = plainToHtml(body)
        const variables: Record<string, string> = {
          ...defaultVars,
          CONTENT: contentHtml,
        }

        // Replace placeholders in template HTML
        let html = template.bodyHtml
        Object.entries(TEMPLATE_VARIABLES).forEach(([key, placeholder]) => {
          const value = variables[key] || ''
          html = html.replace(new RegExp(placeholder, 'g'), value)
        })
        finalBodyHtml = html

        // Generate plain text from HTML (strip tags)
        const div = document.createElement('div')
        div.innerHTML = html
        finalBodyText = div.textContent || div.innerText || html.replace(/<[^>]*>/g, '')
      } else {
        // Fallback: simple HTML with line breaks
        finalBodyHtml = plainToHtml(body)
        finalBodyText = body
      }

      await emailOutboundService.sendEmail(emailAliasId, {
        aliasId: emailAliasId,
        recipientEmail: to[0], cc, bcc, subject,
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        attachments: allAttachments,
      })

      if (draftId) {
        await emailOutboundService.softDelete(draftId)
      }

      resetForm()
      onClose()
      showSuccess('Email sent successfully!')
    } catch (error) {
      console.error('Error sending email:', error)
      showError('Failed to send email: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setSending(false)
    }
  }, [emailAliasId, to, subject, attachments, cc, bcc, body, draftId, confirm, onClose, showSuccess, showError, selectedTemplateId, getTemplate, user])

  // ========================================================================
  // FORM MANAGEMENT
  // ========================================================================

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
    // Reset template to default
    const defaultTemplateId = templates.find(t => t.isDefault)?.id || templates[0]?.id
    if (defaultTemplateId) {
      setSelectedTemplateId(defaultTemplateId)
    }
  }, [templates])

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
      <label 
        className="text-sm font-medium pt-2 min-w-[50px] flex-shrink-0"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </label>
      
      <div 
        className={`flex-1 flex flex-wrap gap-1.5 p-2 rounded-lg transition-all min-h-[40px] ${
          focusedField === fieldName ? 'ring-2' : ''
        }`}
        style={{ 
          backgroundColor: colors.surfaceHover,
          border: `1px solid ${focusedField === fieldName ? colors.primary : colors.border}`,
        }}
      >
        {recipients.map((recipient) => (
          <span
            key={recipient}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm"
            style={{ 
              backgroundColor: colors.primary + '20', 
              color: colors.primary 
            }}
          >
            <User size={12} />
            {recipient}
            <button
              type="button"
              onClick={() => removeRecipient(recipient, recipients, setRecipients)}
              className="ml-1 hover:opacity-70"
            >
              ×
            </button>
          </span>
        ))}
        
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

  if (!isOpen) return null

  return (
    <>
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        {/* Modal */}
        <div
          className="flex flex-col rounded-xl shadow-2xl overflow-hidden transition-all duration-200"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            width: isMinimized ? MODAL_DIMENSIONS.WIDTH_MINIMIZED : MODAL_DIMENSIONS.WIDTH_EXPANDED,
            height: isMinimized ? 'auto' : MODAL_DIMENSIONS.HEIGHT_EXPANDED,
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: colors.divider }}
          >
            <span 
              className="font-medium text-sm"
              style={{ color: colors.textPrimary }}
            >
              {draftId ? 'Edit Draft' : 'New Message'}
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: colors.textSecondary }}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg transition-colors hover:text-red-500"
                style={{ color: colors.textSecondary }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Form */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Recipients */}
              <div className="px-4 pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  {renderRecipientField('To', to, setTo, toInput, setToInput, 'recipient@email.com', 'to')}
                  
                  <div className="flex gap-1 pt-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCc(!showCc)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ 
                        color: showCc ? colors.primary : colors.textTertiary,
                        backgroundColor: showCc ? colors.primary + '20' : colors.surfaceHover
                      }}
                    >
                      Cc
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBcc(!showBcc)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ 
                        color: showBcc ? colors.primary : colors.textTertiary,
                        backgroundColor: showBcc ? colors.primary + '20' : colors.surfaceHover
                      }}
                    >
                      Bcc
                    </button>
                  </div>
                </div>

                {showCc && renderRecipientField('Cc', cc, setCc, ccInput, setCcInput, 'cc@email.com', 'cc')}
                {showBcc && renderRecipientField('Bcc', bcc, setBcc, bccInput, setBccInput, 'bcc@email.com', 'bcc')}

                {/* Subject */}
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
                    className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
                    style={{
                      backgroundColor: colors.surfaceHover,
                      border: `1px solid ${focusedField === 'subject' ? colors.primary : colors.border}`,
                      color: colors.textPrimary,
                    }}
                    onFocus={() => setFocusedField('subject')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>

                {/* Template Selector */}
                <div className="flex items-center gap-3">
                  <label
                    className="text-sm font-medium min-w-[50px] flex-shrink-0"
                    style={{ color: colors.textSecondary }}
                  >
                    Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
                    style={{
                      backgroundColor: colors.surfaceHover,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 px-4 py-3 overflow-hidden">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full h-full px-3 py-2 rounded-lg resize-none outline-none text-sm leading-relaxed"
                  style={{
                    backgroundColor: colors.surfaceHover,
                    border: `1px solid ${focusedField === 'body' ? colors.primary : colors.border}`,
                    color: colors.textPrimary,
                  }}
                  onFocus={() => setFocusedField('body')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 border-t" style={{ borderColor: colors.divider }}>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="inline-flex items-center gap-2 px-2 py-1 rounded text-sm"
                        style={{ 
                          backgroundColor: colors.surfaceHover,
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        <FileText size={14} style={{ color: colors.primary }} />
                        <span className="truncate max-w-[100px]" style={{ color: colors.textPrimary }}>
                          {attachment.name}
                        </span>
                        <span className="text-xs" style={{ color: colors.textTertiary }}>
                          ({formatFileSize(attachment.size)})
                        </span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="hover:opacity-70"
                          style={{ color: colors.textSecondary }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div
                className="flex items-center justify-between px-4 py-3 border-t"
                style={{ borderColor: colors.divider }}
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: colors.textSecondary }}
                    title="Attach files"
                  >
                    <Paperclip size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={autosaveDraft}
                    disabled={savingDraft || !subject}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                    style={{ color: colors.textSecondary }}
                  >
                    <Save size={14} />
                    Save
                  </button>

                  <span className="text-xs" style={{ color: colors.textTertiary }}>
                    {savingDraft && 'Saving...'}
                    {draftId && !savingDraft && 'Draft saved'}
                  </span>
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending || to.length === 0 || !subject}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Send size={16} />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
