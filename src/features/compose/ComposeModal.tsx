import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Paperclip, Send, Save, Trash2, Minimize2, Maximize2, ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react'
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
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

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
    setToInput('')
    setCcInput('')
    setBccInput('')
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className="flex flex-col rounded-xl shadow-2xl transition-all duration-300 overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            width: isMinimized ? '500px' : '680px',
            height: isMinimized ? 'auto' : '580px',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}05)`,
              borderBottom: `1px solid ${colors.divider}` 
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: colors.primary + '20' }}
              >
                <Sparkles size={16} style={{ color: colors.primary }} />
              </div>
              <div>
                <h2 className="font-semibold text-base" style={{ color: colors.textPrimary }}>
                  {draftId ? 'Edit Draft' : 'New Message'}
                </h2>
                <p className="text-xs" style={{ color: colors.textTertiary }}>
                  From: {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: colors.textSecondary }}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                style={{ color: colors.textSecondary }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Recipients Section */}
              <div className="px-5 pt-4 space-y-3">
                {/* To Field */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 pt-2 min-w-[60px]">
                    <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                      To
                    </label>
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
                    className={`flex-1 flex flex-wrap gap-1.5 p-2 rounded-lg transition-all ${focusedField === 'to' ? 'ring-2' : ''}`}
                    style={{ 
                      backgroundColor: colors.surfaceHover,
                      border: `1px solid ${focusedField === 'to' ? colors.primary : colors.border}`,
                      boxShadow: focusedField === 'to' ? `0 0 0 2px ${colors.primary}30` : undefined
                    }}
                  >
                    {to.map((recipient) => (
                      <span
                        key={recipient}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium"
                        style={{ 
                          backgroundColor: colors.primary + '15', 
                          color: colors.primary 
                        }}
                      >
                        {recipient}
                        <button
                          type="button"
                          onClick={() => setTo(prev => prev.filter(r => r !== recipient))}
                          className="hover:opacity-70 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      ref={toInputRef}
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
                      className="flex-1 min-w-[150px] bg-transparent outline-none text-sm"
                      style={{ color: colors.textPrimary }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* CC Field */}
                {showCc && (
                  <div className="flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-sm font-medium pt-2 min-w-[60px]" style={{ color: colors.textSecondary }}>
                      Cc
                    </label>
                    <div 
                      className={`flex-1 flex flex-wrap gap-1.5 p-2 rounded-lg transition-all ${focusedField === 'cc' ? 'ring-2' : ''}`}
                      style={{ 
                        backgroundColor: colors.surfaceHover,
                        border: `1px solid ${focusedField === 'cc' ? colors.primary : colors.border}`,
                        boxShadow: focusedField === 'cc' ? `0 0 0 2px ${colors.primary}30` : undefined
                      }}
                    >
                      {cc.map((recipient) => (
                        <span
                          key={recipient}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium"
                          style={{ 
                            backgroundColor: colors.primary + '15', 
                            color: colors.primary 
                          }}
                        >
                          {recipient}
                          <button
                            type="button"
                            onClick={() => setCc(prev => prev.filter(r => r !== recipient))}
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
                        className="flex-1 min-w-[150px] bg-transparent outline-none text-sm"
                        style={{ color: colors.textPrimary }}
                      />
                    </div>
                  </div>
                )}

                {/* BCC Field */}
                {showBcc && (
                  <div className="flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-sm font-medium pt-2 min-w-[60px]" style={{ color: colors.textSecondary }}>
                      Bcc
                    </label>
                    <div 
                      className={`flex-1 flex flex-wrap gap-1.5 p-2 rounded-lg transition-all ${focusedField === 'bcc' ? 'ring-2' : ''}`}
                      style={{ 
                        backgroundColor: colors.surfaceHover,
                        border: `1px solid ${focusedField === 'bcc' ? colors.primary : colors.border}`,
                        boxShadow: focusedField === 'bcc' ? `0 0 0 2px ${colors.primary}30` : undefined
                      }}
                    >
                      {bcc.map((recipient) => (
                        <span
                          key={recipient}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium"
                          style={{ 
                            backgroundColor: colors.primary + '15', 
                            color: colors.primary 
                          }}
                        >
                          {recipient}
                          <button
                            type="button"
                            onClick={() => setBcc(prev => prev.filter(r => r !== recipient))}
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
                        className="flex-1 min-w-[150px] bg-transparent outline-none text-sm"
                        style={{ color: colors.textPrimary }}
                      />
                    </div>
                  </div>
                )}

                {/* Subject Field */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium min-w-[60px]" style={{ color: colors.textSecondary }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                    className="flex-1 px-3 py-2 rounded-lg outline-none text-sm transition-all"
                    style={{
                      backgroundColor: colors.surfaceHover,
                      border: `1px solid ${focusedField === 'subject' ? colors.primary : colors.border}`,
                      color: colors.textPrimary,
                    }}
                    onFocus={() => setFocusedField('subject')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 px-5 py-3 overflow-hidden">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full h-full px-4 py-3 rounded-lg resize-none outline-none text-sm leading-relaxed transition-all"
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
                <div className="px-5 py-2 border-t" style={{ borderColor: colors.divider }}>
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
                        <span className="truncate max-w-[120px]" style={{ color: colors.textPrimary }}>
                          {attachment.name}
                        </span>
                        <span className="text-xs" style={{ color: colors.textTertiary }}>
                          {formatFileSize(attachment.size)}
                        </span>
                        <button
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

              {/* Footer */}
              <div
                className="flex items-center justify-between px-5 py-3 border-t"
                style={{ 
                  borderColor: colors.divider,
                  backgroundColor: colors.background
                }}
              >
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
                    className="p-2 rounded-lg transition-all hover:scale-105"
                    style={{ 
                      color: colors.textSecondary,
                      backgroundColor: colors.surfaceHover
                    }}
                    title="Attach files"
                  >
                    <Paperclip size={18} />
                  </button>

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
                    <Save size={16} />
                    <span>Save</span>
                  </button>

                  <div className="text-xs" style={{ color: colors.textTertiary }}>
                    {savingDraft && 'Saving...'}
                    {draftId && !savingDraft && 'Draft saved'}
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending || to.length === 0 || !subject}
                  className="px-5 py-2 rounded-lg flex items-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                  style={{
                    backgroundColor: sending || to.length === 0 || !subject ? colors.textTertiary : colors.primary,
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
