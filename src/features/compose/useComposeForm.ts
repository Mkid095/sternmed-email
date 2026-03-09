/**
 * useComposeForm Hook
 *
 * Manages email composition state and operations for a single compose window.
 * Supports sending, saving drafts, and attachment handling.
 *
 * @module features/compose/useComposeForm
 */

import { useState, useCallback, useEffect, ChangeEvent } from 'react'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'

/**
 * Attachment during compose (includes File object)
 */
export interface ComposeAttachment {
  id: string
  name: string
  size: number
  type: string
  file: File
  cloudinaryUrl?: string
}

/**
 * Email compose form data structure
 */
export interface ComposeForm {
  /** Recipient email address */
  to: string[]
  /** CC recipients */
  cc: string[]
  /** BCC recipients */
  bcc: string[]
  /** Email subject line */
  subject: string
  /** Email body content (plain text) */
  body: string
  /** Attachments */
  attachments: ComposeAttachment[]
}

/**
 * Hook options
 */
export interface UseComposeFormOptions {
  /** Initial values for the form (e.g., for reply/forward) */
  initialValues?: Partial<ComposeForm>
}

/**
 * Upload attachments to Cloudinary and return URLs
 */
async function uploadAttachments(
  attachments: ComposeAttachment[]
): Promise<{ filename: string; url: string; type: string; size: number }[]> {
  const outboundAttachments: { filename: string; url: string; type: string; size: number }[] = []

  for (const attachment of attachments) {
    try {
      const url = await storageService.uploadFile(attachment.file, 'email_attachments')
      outboundAttachments.push({
        filename: attachment.name,
        url,
        type: attachment.type,
        size: attachment.size,
      })
    } catch (error) {
      console.error(`Failed to upload attachment ${attachment.name}:`, error)
      throw new Error(`Failed to upload attachment: ${attachment.name}`)
    }
  }

  return outboundAttachments
}

/**
 * Custom hook for managing a compose form instance
 *
 * @param options - Hook options including initial values
 * @returns Form state, handlers, and actions
 */
export function useComposeForm(options: UseComposeFormOptions = {}) {
  const { initialValues } = options

  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  // Form state
  const [form, setForm] = useState<ComposeForm>({
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body: '',
    attachments: [],
    ...initialValues,
  })

  // Sending/drafting state
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  /**
   * Reset form to initial values (or empty)
   */
  const resetForm = useCallback(() => {
    setForm({
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      body: '',
      attachments: [],
      ...initialValues,
    })
  }, [initialValues])

  /**
   * Update a single form field
   */
  const handleInputChange = useCallback(
    (field: keyof ComposeForm, value: any) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  /**
   * Handle file input change
   */
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const maxFileSize = 10 * 1024 * 1024 // 10MB per file
    const maxTotalSize = 100 * 1024 * 1024 // 100MB total

    const newAttachments: ComposeAttachment[] = []
    let totalSize = form.attachments.reduce((sum, att) => sum + att.size, 0)

    for (const file of Array.from(files)) {
      // Validate file size
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size per file is 10MB.`)
        continue
      }

      // Check total size
      if (totalSize + file.size > maxTotalSize) {
        alert(`Total attachment size exceeds 100MB limit.`)
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
      handleInputChange('attachments', [...form.attachments, ...newAttachments])
    }
  }, [form.attachments, handleInputChange])

  /**
   * Remove an attachment
   */
  const removeAttachment = useCallback((id: string) => {
    handleInputChange(
      'attachments',
      form.attachments.filter((a) => a.id !== id)
    )
  }, [form.attachments, handleInputChange])

  /**
   * Format file size for display
   */
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }, [])

  /**
   * Send email
   */
  const sendEmail = useCallback(async (): Promise<boolean> => {
    if (!emailAliasId) {
      showError('No email alias configured')
      return false
    }

    if (form.to.length === 0 || !form.to[0]) {
      showError('Please enter at least one recipient')
      return false
    }

    if (!form.subject.trim()) {
      showError('Please enter a subject')
      return false
    }

    setSending(true)

    try {
      // Upload attachments to Cloudinary if any
      let uploadedAttachments: { filename: string; url: string; type: string; size: number }[] = []
      if (form.attachments.length > 0) {
        uploadedAttachments = await uploadAttachments(form.attachments)
      }

      // Send via emailOutboundService
      await emailOutboundService.sendEmail(emailAliasId, {
        aliasId: emailAliasId,
        recipientEmail: form.to[0],
        cc: form.cc,
        bcc: form.bcc,
        subject: form.subject,
        bodyText: form.body,
        bodyHtml: form.body.replace(/\n/g, '<br>'),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      })

      showSuccess('Email sent successfully!')
      resetForm()
      return true
    } catch (error) {
      console.error('Error sending email:', error)
      showError('Failed to send email: ' + (error instanceof Error ? error.message : String(error)))
      return false
    } finally {
      setSending(false)
    }
  }, [emailAliasId, form, showSuccess, showError, resetForm])

  /**
   * Save as draft
   */
  const saveAsDraft = useCallback(async (): Promise<boolean> => {
    if (!emailAliasId) {
      showError('No email alias configured')
      return false
    }

    if (!form.subject.trim()) {
      showError('Subject is required for drafts')
      return false
    }

    setSavingDraft(true)

    try {
      await emailOutboundService.saveAsDraft(emailAliasId, {
        recipientEmail: form.to[0] || '',
        cc: form.cc,
        bcc: form.bcc,
        subject: form.subject,
        bodyText: form.body,
        bodyHtml: form.body.replace(/\n/g, '<br>'),
      })

      showSuccess('Draft saved')
      resetForm()
      return true
    } catch (error) {
      console.error('Error saving draft:', error)
      showError('Failed to save draft')
      return false
    } finally {
      setSavingDraft(false)
    }
  }, [emailAliasId, form, showSuccess, showError, resetForm])

  // Apply initial values when they change
  useEffect(() => {
    if (initialValues) {
      setForm((prev) => ({ ...prev, ...initialValues }))
    }
  }, [initialValues])

  return {
    form,
    sending,
    savingDraft,
    handleInputChange,
    handleFileSelect,
    removeAttachment,
    sendEmail,
    saveAsDraft,
    resetForm,
    formatFileSize,
  }
}
