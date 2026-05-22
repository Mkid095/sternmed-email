/**
 * ============================================================================
 * COMPOSE VIEW
 * ============================================================================
 * 
 * Full-page email composition view with clean, Gmail-inspired design.
 * 
 * Features:
 * - Full-page layout for focused writing
 * - Recipient management with chips
 * - CC/BCC toggle fields
 * - File attachments
 * - Draft auto-save
 * - Full dark mode support
 * 
 * @module features/compose/ComposeView
 * @version 2.1.0
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Send,
  Trash2,
  Paperclip,
  Save,
  ArrowLeft,
  FileText,
  User,
  X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useTemplateStore, TEMPLATE_VARIABLES } from '../settings/useTemplateStore'

// ============================================================================
// TYPES
// ============================================================================

interface ComposeAttachment {
  id: string
  name: string
  size: number
  type: string
  file: File
  cloudinaryUrl?: string
  uploading?: boolean
}

type FormField = 'to' | 'cc' | 'bcc' | 'subject' | 'body' | null

// ============================================================================
// CONSTANTS
// ============================================================================

const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
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

export default function ComposeView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const replyToId = searchParams.get('reply')

  const { emailAliasId, user } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  // Form state
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])
  
  // UI state
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
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

  // Load draft from sessionStorage
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
        if (draft.templateId) {
          setSelectedTemplateId(draft.templateId)
        }
        sessionStorage.removeItem('editDraft')
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [])

  // Load reply email
  useEffect(() => {
    if (replyToId && emailAliasId) {
      const loadReplyTo = async () => {
        try {
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

    const newAttachments: ComposeAttachment[] = []
    let totalSize = attachments.reduce((sum, att) => sum + att.size, 0)

    for (const file of Array.from(files)) {
      if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
        alert(`File "${file.name}" exceeds 10MB limit`)
        continue
      }

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
            const { url, publicId } = await storageService.uploadFile(attachment.file, 'email_attachments')
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
        bodyHtml: body.replace(/\n/g, '<br>'),
        attachments: allAttachments,
        templateId: selectedTemplateId,
      }

      if (draftId) {
        await emailOutboundService.updateDraft(draftId, emailAliasId, draftData)
      } else {
        const draft = await emailOutboundService.saveAsDraft(emailAliasId, draftData)
        setDraftId(draft.id)
      }
    } catch (error) {
      console.error('Error autosaving draft:', error)
    } finally {
      setSavingDraft(false)
    }
  }, [emailAliasId, subject, body, attachments, to, cc, bcc, draftId, selectedTemplateId])

  const handleSend = useCallback(async () => {
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

    const confirmed = await confirm({
      title: 'Send Email',
      message: `Are you sure you want to send this email to ${to.join(', ')}?`,
      confirmLabel: 'Send',
      variant: 'info',
    })

    if (!confirmed) return

    setSending(true)

    try {
      const existing = attachments.filter(a => a.cloudinaryUrl).map(a => ({
        filename: a.name, url: a.cloudinaryUrl!, type: a.type, size: a.size,
      }))

      const toUpload = attachments.filter(a => !a.cloudinaryUrl)
      const uploaded = await Promise.all(
        toUpload.map(async (attachment) => {
          const { url, publicId } = await storageService.uploadFile(attachment.file, 'email_attachments')
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

        // Start with template HTML and text
        let html = template.bodyHtml
        let text = template.bodyText

        // Replace all placeholders EXCEPT CONTENT first
        Object.entries(TEMPLATE_VARIABLES).forEach(([key, placeholder]) => {
          if (key === 'CONTENT') return // handle separately
          const value = variables[key] || ''
          html = html.replace(new RegExp(placeholder, 'g'), value)
          text = text.replace(new RegExp(placeholder, 'g'), value)
        })

        // Replace {{content}} placeholder if it exists
        if (html.includes('{{content}}')) {
          html = html.replace(/\{\{content\}\}/g, contentHtml)
        }
        if (text.includes('{{content}}')) {
          text = text.replace(/\{\{content\}\}/g, body) // plain body
        }

        finalBodyHtml = html
        finalBodyText = text
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
  }, [emailAliasId, to, subject, attachments, cc, bcc, body, draftId, confirm, navigate, selectedTemplateId, getTemplate, user])

  const handleDiscard = useCallback(async () => {
    const result = await confirm({
      title: 'Discard Message',
      message: 'Are you sure you want to discard this email? Any unsaved changes will be lost.',
      confirmLabel: 'Discard',
      variant: 'danger',
    })

    if (result) {
      if (draftId) {
        await emailOutboundService.softDelete(draftId)
      }
      navigate(-1)
    }
  }, [draftId, confirm, navigate])

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
    <div className="flex items-start gap-4">
      <label 
        className="text-sm font-medium pt-2.5 min-w-[80px] flex-shrink-0"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </label>
      
      <div 
        className={`flex-1 flex flex-wrap gap-1.5 p-2.5 rounded-lg transition-all min-h-[44px] ${
          focusedField === fieldName ? 'ring-2' : ''
        }`}
        style={{ 
          backgroundColor: colors.surface,
          border: `1px solid ${focusedField === fieldName ? colors.primary : colors.border}`,
        }}
      >
        {recipients.map((recipient, idx) => (
          <span
            key={idx}
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
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: colors.divider }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: colors.textSecondary }}
          >
            <ArrowLeft size={20} />
          </button>
          
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

        <button
          onClick={handleDiscard}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:text-red-600"
          style={{ color: colors.textSecondary }}
        >
          <Trash2 size={16} />
          Discard
        </button>
      </header>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {/* Recipients */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {renderRecipientField('To', to, setTo, toInput, setToInput, 'recipient@email.com', 'to')}
              
              <div className="flex gap-2 pt-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className="text-xs px-3 py-2 rounded-lg font-medium transition-colors"
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
                  className="text-xs px-3 py-2 rounded-lg font-medium transition-colors"
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
                className="flex-1 px-4 py-3 rounded-lg outline-none text-sm"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${focusedField === 'subject' ? colors.primary : colors.border}`,
                  color: colors.textPrimary,
                }}
                onFocus={() => setFocusedField('subject')}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            {/* Template Selector */}
            <div className="flex items-center gap-4">
              <label
                className="text-sm font-medium min-w-[80px] flex-shrink-0"
                style={{ color: colors.textSecondary }}
              >
                Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg outline-none text-sm"
                style={{
                  backgroundColor: colors.surface,
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
          <div className="flex flex-col gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={14}
              className="w-full px-4 py-3 rounded-lg outline-none resize-none text-sm leading-relaxed"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${focusedField === 'body' ? colors.primary : colors.border}`,
                color: colors.textPrimary,
              }}
              onFocus={() => setFocusedField('body')}
              onBlur={() => setFocusedField(null)}
            />
            <p className="text-xs px-1" style={{ color: colors.textTertiary }}>
              Supports plain text. Use *bold* or - lists for simple formatting.
            </p>
          </div>

          {/* Attachments */}
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
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
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
        </div>
      </div>

      {/* Footer */}
      <footer
        className="px-6 py-4 flex items-center justify-between border-t"
        style={{ borderColor: colors.divider, backgroundColor: colors.surface }}
      >
        <div className="flex items-center gap-4">
          <p className="text-sm" style={{ color: colors.textTertiary }}>
            {savingDraft ? 'Saving draft...' : draftId && !savingDraft ? 'Draft saved' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: colors.surfaceHover, color: colors.textSecondary }}
          >
            <Paperclip size={16} />
            Attach
          </button>

          <button
            type="button"
            onClick={autosaveDraft}
            disabled={savingDraft || !subject}
            className="px-4 py-2.5 text-sm rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: colors.surfaceHover, color: colors.textSecondary }}
          >
            <Save size={16} />
            Save Draft
          </button>
          
          <button
            onClick={handleSend}
            disabled={sending || to.length === 0 || !subject}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-white rounded-lg disabled:opacity-50"
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
