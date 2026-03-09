import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Paperclip, Send, Save, Trash2, Minimize2, Maximize2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

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

export default function ComposeModal({ isOpen, onClose, replyToId, initialData }: ComposeModalProps) {
  const navigate = useNavigate()
  const { emailAliasId, user } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  const [to, setTo] = useState<string[]>(initialData?.to || [])
  const [cc, setCc] = useState<string[]>(initialData?.cc || [])
  const [bcc, setBcc] = useState<string[]>(initialData?.bcc || [])
  const [subject, setSubject] = useState(initialData?.subject || '')
  const [body, setBody] = useState(initialData?.body || '')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load email to reply to
  useEffect(() => {
    if (replyToId && emailAliasId) {
      const loadReplyTo = async () => {
        try {
          const { emailInboundService } = await import('../../services/supabase/email-inbound.service')
          const email = await emailInboundService.getEmailById(replyToId)
          if (email) {
            setTo([email.senderEmail])
            setSubject(`Re: ${email.subject || ''}`)
            const replyBody = `\n\n--- Original message ---\nFrom: ${email.senderName || email.senderEmail}\nDate: ${new Date(email.receivedAt).toLocaleString()}\n\n${email.bodyText || ''}`
            setBody(replyBody)
          }
        } catch (error) {
          console.error('Error loading email to reply to:', error)
        }
      }
      loadReplyTo()
    }
  }, [replyToId, emailAliasId])

  // Autosave effect
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    if (subject || body) {
      autosaveTimerRef.current = setTimeout(autosaveDraft, 2000)
    }

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [to, cc, bcc, subject, body, attachments])

  const autosaveDraft = async () => {
    if (!emailAliasId || (!subject && !body)) return

    setSavingDraft(true)

    try {
      const uploadedAttachments = await Promise.all(
        attachments.filter(a => !a.cloudinaryUrl).map(async (attachment) => {
          const url = await storageService.uploadFile(attachment.file, 'email_attachments')
          return {
            filename: attachment.name,
            url,
            type: attachment.type,
            size: attachment.size,
          }
        })
      )

      const allAttachments = [
        ...attachments.filter(a => a.cloudinaryUrl).map(a => ({
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
        // For simplicity, create new draft (could update existing)
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
  }

  const handleSend = async () => {
    if (!emailAliasId) {
      alert('No email alias configured')
      return
    }

    if (to.length === 0 || !to[0]) {
      alert('Please enter at least one recipient')
      return
    }

    if (!subject.trim()) {
      alert('Please enter a subject')
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

      if (draftId) {
        await emailOutboundService.softDelete(draftId)
      }

      resetForm()
      onClose()
      alert('Email sent successfully!')
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setTo([])
    setCc([])
    setBcc([])
    setSubject('')
    setBody('')
    setAttachments([])
    setDraftId(null)
    setIsMinimized(false)
  }

  const handleClose = async () => {
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
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const maxFileSize = 10 * 1024 * 1024
    const maxTotalSize = 100 * 1024 * 1024

    const newAttachments: Attachment[] = []
    let totalSize = attachments.reduce((sum, att) => sum + att.size, 0)

    for (const file of Array.from(files)) {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} exceeds 10MB limit`)
        continue
      }

      if (totalSize + file.size > maxTotalSize) {
        alert('Total attachment size exceeds 100MB')
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

    setAttachments(prev => [...prev, ...newAttachments])
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

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

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className="flex flex-col rounded-lg shadow-2xl transition-all"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            width: isMinimized ? '600px' : '800px',
            height: isMinimized ? 'auto' : '600px',
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: colors.divider }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                style={{ color: colors.textSecondary }}
              >
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
              <span className="font-medium" style={{ color: colors.textPrimary }}>
                {draftId ? 'Draft' : 'New Message'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* To Field */}
              <div className="flex items-start gap-3 p-4 border-b" style={{ borderColor: colors.divider }}>
                <label className="text-sm font-medium pt-2 min-w-[50px]" style={{ color: colors.textSecondary }}>
                  To
                </label>
                <div className="flex-1 flex flex-wrap gap-2">
                  {to.map((recipient) => (
                    <span
                      key={recipient}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: colors.surfaceHover, color: colors.textPrimary }}
                    >
                      {recipient}
                      <button
                        type="button"
                        onClick={() => setTo(prev => prev.filter(r => r !== recipient))}
                        className="hover:text-red-500"
                        style={{ color: colors.textSecondary }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value=""
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.endsWith(',') || value.endsWith(';')) {
                        const newRecipient = value.slice(0, -1).trim()
                        if (newRecipient && newRecipient.includes('@') && !to.includes(newRecipient)) {
                          setTo(prev => [...prev, newRecipient])
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault()
                      const paste = e.clipboardData.getData('text')
                      const recipients = paste.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
                      const unique = [...to, ...recipients].filter((v, i, a) => a.indexOf(v) === i)
                      setTo(unique.slice(0, 10))
                    }}
                    placeholder="email@example.com"
                    className="flex-1 min-w-[200px] px-2 py-1 rounded"
                    style={{
                      backgroundColor: colors.surfaceHover,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
              </div>

              {/* CC/BCC */}
              <div className="px-4 py-2 flex gap-4 text-sm" style={{ color: colors.textSecondary }}>
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className={`${showCc ? 'text-blue-600 font-medium' : ''} hover:text-blue-600`}
                >
                  Cc
                </button>
                <button
                  type="button"
                  onClick={() => setShowBcc(!showBcc)}
                  className={`${showBcc ? 'text-blue-600 font-medium' : ''} hover:text-blue-600`}
                >
                  Bcc
                </button>
              </div>

              {showCc && (
                <div className="flex items-start gap-3 px-4 pb-3 border-b" style={{ borderColor: colors.divider }}>
                  <label className="text-sm font-medium pt-2 min-w-[50px]" style={{ color: colors.textSecondary }}>
                    Cc
                  </label>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {cc.map((recipient) => (
                      <span
                        key={recipient}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: colors.surfaceHover, color: colors.textPrimary }}
                      >
                        {recipient}
                        <button
                          type="button"
                          onClick={() => setCc(prev => prev.filter(r => r !== recipient))}
                          className="hover:text-red-500"
                          style={{ color: colors.textSecondary }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value=""
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.endsWith(',') || value.endsWith(';')) {
                          const newRecipient = value.slice(0, -1).trim()
                          if (newRecipient && newRecipient.includes('@') && !cc.includes(newRecipient)) {
                            setCc(prev => [...prev, newRecipient])
                          }
                        }
                      }}
                      placeholder="cc@example.com"
                      className="flex-1 min-w-[200px] px-2 py-1 rounded"
                      style={{
                        backgroundColor: colors.surfaceHover,
                        border: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                      }}
                    />
                  </div>
                </div>
              )}

              {showBcc && (
                <div className="flex items-start gap-3 px-4 pb-3 border-b" style={{ borderColor: colors.divider }}>
                  <label className="text-sm font-medium pt-2 min-w-[50px]" style={{ color: colors.textSecondary }}>
                    Bcc
                  </label>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {bcc.map((recipient) => (
                      <span
                        key={recipient}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: colors.surfaceHover, color: colors.textPrimary }}
                      >
                        {recipient}
                        <button
                          type="button"
                          onClick={() => setBcc(prev => prev.filter(r => r !== recipient))}
                          className="hover:text-red-500"
                          style={{ color: colors.textSecondary }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value=""
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.endsWith(',') || value.endsWith(';')) {
                          const newRecipient = value.slice(0, -1).trim()
                          if (newRecipient && newRecipient.includes('@') && !bcc.includes(newRecipient)) {
                            setBcc(prev => [...prev, newRecipient])
                          }
                        }
                      }}
                      placeholder="bcc@example.com"
                      className="flex-1 min-w-[200px] px-2 py-1 rounded"
                      style={{
                        backgroundColor: colors.surfaceHover,
                        border: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: colors.divider }}>
                <label className="text-sm font-medium min-w-[50px]" style={{ color: colors.textSecondary }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  className="flex-1 px-2 py-1 rounded"
                  style={{
                    backgroundColor: colors.surfaceHover,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>

              {/* Body */}
              <div className="flex-1 p-4 overflow-hidden">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email content..."
                  className="w-full h-full px-3 py-2 rounded resize-none"
                  style={{
                    backgroundColor: colors.surfaceHover,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                />
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 border-t" style={{ borderColor: colors.divider }}>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                        style={{ backgroundColor: colors.surfaceHover, color: colors.textPrimary }}
                      >
                        <span className="truncate max-w-[150px]">{attachment.name}</span>
                        <span style={{ color: colors.textTertiary }}>({formatFileSize(attachment.size)})</span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="hover:text-red-500"
                          style={{ color: colors.textSecondary }}
                        >
                          ×
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
                  {savingDraft && (
                    <span className="text-sm" style={{ color: colors.textTertiary }}>Saving...</span>
                  )}
                  {draftId && !savingDraft && (
                    <span className="text-sm" style={{ color: colors.textTertiary }}>Draft saved</span>
                  )}
                </div>

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
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{ color: colors.textSecondary }}
                    title="Attach files"
                  >
                    <Paperclip size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={autosaveDraft}
                    disabled={savingDraft || !subject}
                    className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <Save size={18} />
                    <span className="text-sm">Save</span>
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={sending || to.length === 0 || !subject}
                    className="px-6 py-2 rounded-lg flex items-center gap-2"
                    style={{
                      backgroundColor: sending || to.length === 0 || !subject ? colors.textTertiary : colors.primary,
                      color: 'white',
                    }}
                  >
                    <Send size={18} />
                    <span className="text-sm font-medium">Send</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
