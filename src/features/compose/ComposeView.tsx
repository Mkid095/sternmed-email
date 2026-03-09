import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, Trash2, File, Paperclip, Save, Bold, Italic, Underline, List } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

interface ComposeAttachment {
  id: string
  name: string
  size: number
  type: string
  file: File
  cloudinaryUrl?: string
  uploading?: boolean
}

export default function ComposeView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const replyToId = searchParams.get('reply')
  const { emailAliasId, user } = useAuthStore()
  const { confirm, confirmation } = useConfirmationModal()

  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load draft from sessionStorage on mount (for editing)
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

  // Load email to reply to
  useEffect(() => {
    if (replyToId && emailAliasId) {
      const loadReplyTo = async () => {
        try {
          const email = await emailInboundService.getEmailById(replyToId)
          if (email) {
            setTo([email.senderEmail])
            setSubject(`Re: ${email.subject || ''}`)
            setBody(`\n\n--- Original message ---\nFrom: ${email.senderName || email.senderEmail}\nDate: ${new Date(email.receivedAt).toLocaleString()}\n\n${email.bodyText || ''}`)
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

    // Only autosave if there's content
    if (subject || body) {
      autosaveTimerRef.current = setTimeout(autosaveDraft, 2000)
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [to, cc, bcc, subject, body, attachments])

  const autosaveDraft = async () => {
    if (!emailAliasId || (!subject && !body)) return

    setSavingDraft(true)

    try {
      // Upload attachments to Cloudinary
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

      // Merge with already-uploaded attachments (existing are guaranteed to have cloudinaryUrl due to filter)
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
        // Update existing draft by creating a new pending record (email_outbound doesn't have true updates for drafts)
        // For simplicity, we'll create a new draft
        await emailOutboundService.saveAsDraft(emailAliasId, draftData)
      } else {
        // Create new draft
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

    const confirmed = await confirm({
      title: 'Send Email',
      message: `Are you sure you want to send this email to ${to.join(', ')}?`,
      confirmLabel: 'Send',
      variant: 'info',
    })

    if (!confirmed) return

    setSending(true)

    try {
      // Separate attachments: existing (with cloudinaryUrl) and new (need upload)
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

      // Send via service (this handles rate limiting, etc.)
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

      // Delete draft record if this was a draft
      if (draftId) {
        await emailOutboundService.softDelete(draftId)
      }

      // Reset form
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
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const maxTotalSize = 100 * 1024 * 1024 // 100MB

    const newAttachments: ComposeAttachment[] = []
    let totalSize = attachments.reduce((sum, att) => sum + att.size, 0)

    for (const file of Array.from(files)) {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size per file is 10MB.`)
        continue
      }

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
      setAttachments([...attachments, ...newAttachments])
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleDiscard = async () => {
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
  }

  const handleTextFormat = (format: string) => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.value = body
    textarea.focus()
    document.execCommand(format, false, undefined)
    setBody(textarea.value)
    document.body.removeChild(textarea)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {draftId ? 'Edit Draft' : 'New Email'}
          </h1>
          <p className="text-sm text-gray-500">
            From: {user?.email}
          </p>
        </div>
        <button
          onClick={handleDiscard}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Discard
        </button>
      </div>

      {/* Compose Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* To Field */}
          <div className="flex items-start gap-2">
            <label className="w-16 text-sm font-medium text-gray-600 pt-2">To:</label>
            <div className="flex-1 flex flex-wrap gap-2">
              {to.map((recipient, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  {recipient}
                  <button
                    type="button"
                    onClick={() => setTo(to.filter((_, i) => i !== idx))}
                    className="text-gray-500 hover:text-gray-700 ml-1"
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
                    if (newRecipient && !to.includes(newRecipient) && newRecipient.includes('@')) {
                      setTo([...to, newRecipient])
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
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* CC/BCC Toggle */}
          <div className="flex gap-4 ml-18">
            <button
              type="button"
              onClick={() => setShowCc(!showCc)}
              className={`text-sm ${showCc ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
            >
              Cc
            </button>
            <button
              type="button"
              onClick={() => setShowBcc(!showBcc)}
              className={`text-sm ${showBcc ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
            >
              Bcc
            </button>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="flex items-start gap-2">
              <label className="w-16 text-sm font-medium text-gray-600 pt-2">Cc:</label>
              <div className="flex-1 flex flex-wrap gap-2">
                {cc.map((recipient, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                  >
                    {recipient}
                    <button
                      type="button"
                      onClick={() => setCc(cc.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-gray-700 ml-1"
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
                      if (newRecipient && !cc.includes(newRecipient) && newRecipient.includes('@')) {
                        setCc([...cc, newRecipient])
                      }
                    }
                  }}
                  placeholder="cc@example.com"
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="flex items-start gap-2">
              <label className="w-16 text-sm font-medium text-gray-600 pt-2">Bcc:</label>
              <div className="flex-1 flex flex-wrap gap-2">
                {bcc.map((recipient, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                  >
                    {recipient}
                    <button
                      type="button"
                      onClick={() => setBcc(bcc.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-gray-700 ml-1"
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
                      if (newRecipient && !bcc.includes(newRecipient) && newRecipient.includes('@')) {
                        setBcc([...bcc, newRecipient])
                      }
                    }
                  }}
                  placeholder="bcc@example.com"
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <label className="w-16 text-sm font-medium text-gray-600">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email content here..."
              rows={12}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Supports plain text. Use *bold* or - lists for simple formatting.
            </p>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                  >
                    <File className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 max-w-[200px] truncate">
                      {attachment.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({formatFileSize(attachment.size)})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {savingDraft ? 'Saving draft...' : draftId && !savingDraft ? 'Draft saved' : ''}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              Attach
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={autosaveDraft}
              disabled={savingDraft || !subject}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={handleSend}
              disabled={sending || to.length === 0 || !subject}
              className={`inline-flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors ${
                sending || to.length === 0 || !subject
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

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
