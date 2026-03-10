import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, Trash2, File, Paperclip, Save, Sparkles, ArrowLeft, FileText, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme } from '../../contexts/ThemeContext'
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
  const { colors } = useTheme()
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
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

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

  const addRecipient = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = value.trim()
    if (trimmed && trimmed.includes('@') && !list.includes(trimmed)) {
      setList([...list, trimmed])
      setInput('')
    }
  }

  const handleKeyDown = (
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
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary}10, ${colors.primary}05)`,
          borderBottom: `1px solid ${colors.divider}` 
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
            style={{ color: colors.textSecondary }}
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
              <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                {draftId ? 'Edit Draft' : 'New Email'}
              </h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                From: {user?.email}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleDiscard}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 hover:text-red-600"
          style={{ color: colors.textSecondary }}
        >
          <Trash2 size={16} />
          Discard
        </button>
      </div>

      {/* Compose Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {/* To Field */}
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-2 pt-2 min-w-[80px]">
              <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>To</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className="text-xs px-1.5 py-0.5 rounded transition-colors"
                  style={{ 
                    color: showCc ? colors.primary : colors.textTertiary,
                    backgroundColor: showCc ? colors.primary + '15' : 'transparent'
                  }}
                >
                  Cc
                </button>
                <button
                  type="button"
                  onClick={() => setShowBcc(!showBcc)}
                  className="text-xs px-1.5 py-0.5 rounded transition-colors"
                  style={{ 
                    color: showBcc ? colors.primary : colors.textTertiary,
                    backgroundColor: showBcc ? colors.primary + '15' : 'transparent'
                  }}
                >
                  Bcc
                </button>
              </div>
            </div>
            <div 
              className={`flex-1 flex flex-wrap gap-1.5 p-2.5 rounded-xl transition-all ${focusedField === 'to' ? 'ring-2' : ''}`}
              style={{ 
                backgroundColor: colors.surface,
                border: `1px solid ${focusedField === 'to' ? colors.primary : colors.border}`,
                boxShadow: focusedField === 'to' ? `0 0 0 2px ${colors.primary}30` : undefined
              }}
            >
              {to.map((recipient, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: colors.primary + '15', 
                    color: colors.primary 
                  }}
                >
                  {recipient}
                  <button
                    type="button"
                    onClick={() => setTo(to.filter((_, i) => i !== idx))}
                    className="hover:opacity-70 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, toInput, to, setTo, setToInput)}
                onBlur={() => {
                  addRecipient(toInput, to, setTo, setToInput)
                  setFocusedField(null)
                }}
                onFocus={() => setFocusedField('to')}
                placeholder={to.length === 0 ? "recipient@email.com" : ""}
                className="flex-1 min-w-[200px] bg-transparent outline-none text-sm"
                style={{ color: colors.textPrimary }}
                autoFocus
              />
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="flex items-start gap-4 animate-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-medium pt-2 min-w-[80px]" style={{ color: colors.textSecondary }}>Cc</label>
              <div 
                className={`flex-1 flex flex-wrap gap-1.5 p-2.5 rounded-xl transition-all ${focusedField === 'cc' ? 'ring-2' : ''}`}
                style={{ 
                  backgroundColor: colors.surface,
                  border: `1px solid ${focusedField === 'cc' ? colors.primary : colors.border}`,
                  boxShadow: focusedField === 'cc' ? `0 0 0 2px ${colors.primary}30` : undefined
                }}
              >
                {cc.map((recipient, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: colors.primary + '15', 
                      color: colors.primary 
                    }}
                  >
                    {recipient}
                    <button
                      type="button"
                      onClick={() => setCc(cc.filter((_, i) => i !== idx))}
                      className="hover:opacity-70 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, ccInput, cc, setCc, setCcInput)}
                  onBlur={() => {
                    addRecipient(ccInput, cc, setCc, setCcInput)
                    setFocusedField(null)
                  }}
                  onFocus={() => setFocusedField('cc')}
                  placeholder={cc.length === 0 ? "cc@email.com" : ""}
                  className="flex-1 min-w-[200px] bg-transparent outline-none text-sm"
                  style={{ color: colors.textPrimary }}
                />
              </div>
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="flex items-start gap-4 animate-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-medium pt-2 min-w-[80px]" style={{ color: colors.textSecondary }}>Bcc</label>
              <div 
                className={`flex-1 flex flex-wrap gap-1.5 p-2.5 rounded-xl transition-all ${focusedField === 'bcc' ? 'ring-2' : ''}`}
                style={{ 
                  backgroundColor: colors.surface,
                  border: `1px solid ${focusedField === 'bcc' ? colors.primary : colors.border}`,
                  boxShadow: focusedField === 'bcc' ? `0 0 0 2px ${colors.primary}30` : undefined
                }}
              >
                {bcc.map((recipient, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: colors.primary + '15', 
                      color: colors.primary 
                    }}
                  >
                    {recipient}
                    <button
                      type="button"
                      onClick={() => setBcc(bcc.filter((_, i) => i !== idx))}
                      className="hover:opacity-70 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, bccInput, bcc, setBcc, setBccInput)}
                  onBlur={() => {
                    addRecipient(bccInput, bcc, setBcc, setBccInput)
                    setFocusedField(null)
                  }}
                  onFocus={() => setFocusedField('bcc')}
                  placeholder={bcc.length === 0 ? "bcc@email.com" : ""}
                  className="flex-1 min-w-[200px] bg-transparent outline-none text-sm"
                  style={{ color: colors.textPrimary }}
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium min-w-[80px]" style={{ color: colors.textSecondary }}>Subject</label>
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
              }}
              onFocus={() => setFocusedField('subject')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Body */}
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
              <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
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
                    <span className="text-sm truncate max-w-[180px]" style={{ color: colors.textPrimary }}>
                      {attachment.name}
                    </span>
                    <span className="text-xs" style={{ color: colors.textTertiary }}>
                      ({formatFileSize(attachment.size)})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="opacity-50 hover:opacity-100 transition-opacity"
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

      {/* Footer Actions */}
      <div
        className="px-6 py-4 flex items-center justify-between border-t"
        style={{ 
          borderColor: colors.divider,
          backgroundColor: colors.surface
        }}
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
            style={{
              backgroundColor: colors.surfaceHover,
              color: colors.textSecondary,
            }}
          >
            <Paperclip size={16} />
            Attach
          </button>

          <button
            type="button"
            onClick={autosaveDraft}
            disabled={savingDraft || !subject}
            className="px-4 py-2 text-sm rounded-xl transition-all inline-flex items-center gap-2 disabled:opacity-50 hover:scale-105"
            style={{
              backgroundColor: colors.surfaceHover,
              color: colors.textSecondary,
            }}
          >
            <Save size={16} />
            Save Draft
          </button>
          
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
