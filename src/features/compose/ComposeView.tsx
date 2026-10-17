/**
 * Compose
 *
 * Single full-page compose surface. Recipients are chips, the body supports
 * lightweight formatting, drafts autosave, and every action gives visible
 * feedback instead of a browser alert().
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Paperclip,
  Send,
  Trash2,
  FileText,
  X,
  Bold,
  Italic,
  Link as LinkIcon,
  List as ListIcon,
  ListOrdered,
  Quote,
  Code,
  Eye,
  PenSquare,
} from 'lucide-react'
import { RichTextEditor } from '../../components/compose/RichTextEditor'
import { htmlToPlainText } from '../../lib/htmlToPlainText'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { storageService } from '../../services/storage.service'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useToastSuccess, useToastError, useToastInfo } from '../shared/ui'
import { useTemplateStore, TEMPLATE_VARIABLES } from '../settings/useTemplateStore'
import { Button, IconButton } from '../../components/ui/Button'
import { RecipientInput } from '../../components/compose/RecipientInput'
import { textToHtml } from '../../lib/textToHtml'
import { COMPANY } from '../../config/brand'
import type { EmailInbound } from '../../types'

const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
} as const

const AUTOSAVE_DELAY = 2000

interface ComposeAttachment {
  id: string
  name: string
  size: number
  type: string
  file: File
  cloudinaryUrl?: string
  uploading?: boolean
  failed?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ComposeView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const replyToId = searchParams.get('reply')

  const { emailAliasId, user } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()
  const showInfo = useToastInfo()

  const { templates, selectedTemplateId, selectTemplate, getTemplate } = useTemplateStore()

  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  /**
   * Body for the rich editor. Kept separate from `body` (plain text) because
   * the two round-trip lossily: HTML back to text loses alignment and inline
   * emphasis. Whichever mode the sender is in is the one that gets sent, and
   * switching modes converts rather than sharing one string.
   */
  const [bodyHtml, setBodyHtml] = useState('')
  const [bodyMode, setBodyMode] = useState<'rich' | 'text'>('rich')

  /**
   * True when the active mode actually holds something.
   *
   * Checking `body.trim()` alone is wrong in rich mode: the content lives in
   * `bodyHtml`, so a fully-written rich message looked empty to the preview,
   * to the send guard and to the leave-page warning.
   */
  const hasBody =
    bodyMode === 'rich'
      ? bodyHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
      : body.trim().length > 0
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])

  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  /** Write shows the source; Preview shows the rendered message. */
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // ── Reply prefill ───────────────────────────────────────────────
  useEffect(() => {
    if (!replyToId || !emailAliasId) return

    let cancelled = false
    ;(async () => {
      try {
        const original = await emailInboundService.getEmailById(replyToId)
        if (!original || cancelled) return

        setTo([original.senderEmail])
        setSubject(original.subject?.startsWith('Re:') ? original.subject : `Re: ${original.subject ?? ''}`.trim())
        // Converted into the rich editor rather than dropped into `body`: rich
        // mode is the default, so prefilling the plain-text state left the
        // quoted message invisible until the sender switched modes.
        const quoted = `\n\n———\nOn ${new Date(original.receivedAt).toLocaleString()}, ${original.senderName || original.senderEmail} wrote:\n${original.bodyText ?? ''}`
        setBody('')
        setBodyHtml(textToHtml(quoted))
        setBodyMode('rich')
      } catch {
        showError('Could not load the message you are replying to')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [replyToId, emailAliasId, showError])

  // ── Prefill from Reply / Forward ─────────────────────────────────
  // The message view hands over its data through sessionStorage rather than
  // the URL: the quoted body can be long, and a URL is the wrong place for it.
  useEffect(() => {
    const replyRaw = sessionStorage.getItem('compose:reply')
    const forwardRaw = sessionStorage.getItem('compose:forward')

    if (replyRaw) {
      sessionStorage.removeItem('compose:reply')
      try {
        const data = JSON.parse(replyRaw)
        setTo(data.to ?? [])
        setCc(data.cc ?? [])
        if (data.subject) setSubject(data.subject)
        if (data.body) {
          setBody('')
          setBodyHtml(textToHtml(data.body))
          setBodyMode('rich')
        }
      } catch {
        // Ignore a malformed hand-off rather than blocking the compose screen.
      }
      window.setTimeout(() => bodyRef.current?.focus(), 50)
      return
    }

    if (forwardRaw) {
      sessionStorage.removeItem('compose:forward')
      try {
        const data = JSON.parse(forwardRaw)
        if (data.subject) setSubject(data.subject)
        if (data.body) {
          setBody('')
          setBodyHtml(textToHtml(data.body))
          setBodyMode('rich')
        }
      } catch {
        // As above.
      }
    }
  }, [])

  // ── Opening a draft ─────────────────────────────────────────────
  useEffect(() => {
    const draftId = sessionStorage.getItem('compose:draftId')
    if (!draftId) return
    sessionStorage.removeItem('compose:draftId')

    let cancelled = false
    ;(async () => {
      try {
        const draft = await emailOutboundService.getEmailById(draftId)
        if (!draft || cancelled) return

        setDraftId(draft.id)
        setTo((draft.recipientEmail ?? '').split(',').map((entry: string) => entry.trim()).filter(Boolean))
        setCc(draft.cc ?? [])
        setBcc(draft.bcc ?? [])
        setSubject(draft.subject ?? '')
        // Restore formatting when the draft carried HTML; older drafts only
        // have text, so those are converted rather than shown as raw markup.
        if (draft.bodyHtml) {
          setBody('')
          setBodyHtml(draft.bodyHtml)
          setBodyMode('rich')
        } else {
          setBody(draft.bodyText ?? '')
          setBodyHtml('')
          setBodyMode('text')
        }
      } catch {
        showError('Could not open that draft')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [showError])

  // ── Attachments ─────────────────────────────────────────────────
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)

      const rejected: string[] = []
      const accepted: ComposeAttachment[] = []
      let runningTotal = attachments.reduce((sum, a) => sum + a.size, 0)

      incoming.forEach((file) => {
        if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
          rejected.push(`${file.name} (over 10 MB)`)
          return
        }
        if (runningTotal + file.size > FILE_CONSTRAINTS.MAX_TOTAL_SIZE) {
          rejected.push(`${file.name} (over 100 MB total)`)
          return
        }
        runningTotal += file.size
        accepted.push({
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          file,
        })
      })

      if (rejected.length > 0) showError(`Skipped ${rejected.join(', ')}`)
      if (accepted.length > 0) setAttachments((prev) => [...prev, ...accepted])
    },
    [attachments, showError]
  )

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  // ── Upload + autosave ───────────────────────────────────────────
  const uploadPending = useCallback(async () => {
    const pending = attachments.filter((a) => !a.cloudinaryUrl)
    if (pending.length === 0) return []

    setAttachments((prev) =>
      prev.map((a) => (!a.cloudinaryUrl ? { ...a, uploading: true } : a))
    )

    const results = await Promise.allSettled(
      pending.map(async (a) => {
        const { url } = await storageService.uploadFile(a.file, 'email_attachments')
        return { id: a.id, url }
      })
    )

    const succeeded = new Map<string, string>()
    let failureCount = 0
    results.forEach((result) => {
      if (result.status === 'fulfilled') succeeded.set(result.value.id, result.value.url)
      else failureCount += 1
    })

    setAttachments((prev) =>
      prev.map((a) =>
        succeeded.has(a.id)
          ? { ...a, cloudinaryUrl: succeeded.get(a.id), uploading: false }
          : succeeded.has(a.id)
            ? a
            : { ...a, uploading: false, failed: true }
      )
    )

    if (failureCount > 0) showError(`${failureCount} attachment${failureCount === 1 ? '' : 's'} failed to upload`)

    return attachments
      .filter((a) => a.cloudinaryUrl || succeeded.has(a.id))
      .map((a) => ({
        filename: a.name,
        url: (succeeded.get(a.id) ?? a.cloudinaryUrl)!,
        type: a.type,
        size: a.size,
      }))
  }, [attachments, showError])

  const draftPayload = useCallback(
    (attachmentList: Array<{ filename: string; url: string; type: string; size: number }>) => ({
      // The schema stores a single recipient column, so a multi-address To
      // field is comma-joined. Previously only to[0] was kept and every other
      // recipient was silently dropped.
      recipientEmail: to.join(', '),
      cc,
      bcc,
      subject,
      // Whichever editor mode is active is authoritative. Reading `body` alone
      // saved an empty draft whenever the sender was writing rich text, because
      // rich content lives in `bodyHtml`.
      bodyText: bodyMode === 'rich' ? htmlToPlainText(bodyHtml) : body,
      bodyHtml: bodyMode === 'rich' ? bodyHtml : textToHtml(body),
      attachments: attachmentList,
      templateId: selectedTemplateId ?? undefined,
    }),
    [to, cc, bcc, subject, body, bodyHtml, bodyMode, selectedTemplateId]
  )

  const autosaveDraft = useCallback(async () => {
    const hasContent = subject.trim() || hasBody
    if (!emailAliasId || !hasContent) return

    setSavingDraft(true)
    try {
      const uploaded = await uploadPending()
      const payload = draftPayload(uploaded)

      if (draftId) {
        await emailOutboundService.updateDraft(draftId, emailAliasId, payload)
      } else {
        const created = await emailOutboundService.saveAsDraft(emailAliasId, payload)
        setDraftId(created.id)
      }
      setDraftSavedAt(new Date().toISOString())
      window.dispatchEvent(new Event('mailbox-changed'))
    } catch {
      // Autosave failing silently means losing work; say so.
      showError('Draft not saved — check your connection')
    } finally {
      setSavingDraft(false)
    }
  }, [emailAliasId, subject, body, bodyHtml, bodyMode, draftId, uploadPending, draftPayload, showError])

  // Debounced autosave, re-armed on every keystroke. Depends on `bodyHtml` too —
  // without it, typing in the rich editor never triggered a save.
  useEffect(() => {
    const richHasText = bodyHtml.replace(/<[^>]*>/g, '').trim().length > 0
    if (!subject.trim() && !hasBody) return
    const timer = window.setTimeout(() => {
      autosaveDraft()
    }, AUTOSAVE_DELAY)
    return () => window.clearTimeout(timer)
  }, [subject, body, bodyHtml, bodyMode, to, cc, bcc, attachments, autosaveDraft])

  // Warn before losing an unsent message.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (subject.trim() || hasBody) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [subject, body])

  // ── Formatting ──────────────────────────────────────────────────
  const wrapSelection = (before: string, after = before) => {
    const el = bodyRef.current
    if (!el) return
    const { selectionStart, selectionEnd, value } = el
    const selected = value.slice(selectionStart, selectionEnd)
    const next = `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`
    setBody(next)
    window.requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(selectionStart + before.length, selectionEnd + before.length)
    })
  }

  const prefixLines = (prefix: string) => {
    const el = bodyRef.current
    if (!el) return
    const { selectionStart, selectionEnd, value } = el
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
    const block = value.slice(lineStart, selectionEnd)
    const prefixed = block
      .split('\n')
      .map((line, i) => (prefix === '1. ' ? `${i + 1}. ${line}` : `${prefix}${line}`))
      .join('\n')
    const next = value.slice(0, lineStart) + prefixed + value.slice(selectionEnd)
    setBody(next)
    window.requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(lineStart, lineStart + prefixed.length)
    })
  }

  const insertLink = () => {
    const url = window.prompt('Link URL (https://…)')
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      showError('Link must start with http:// or https://')
      return
    }
    wrapSelection('[', `](${url})`)
  }

  // ── Content builder ─────────────────────────────────────────────
  /**
   * The single place the outgoing body is produced. Both the live preview and
   * the send path call this, so what you preview is exactly what goes out —
   * they cannot drift apart.
   */
  const buildEmailContent = useCallback((): { html: string; text: string } => {
    const template = selectedTemplateId ? getTemplate(selectedTemplateId) : undefined

    // Whichever mode is active is authoritative. Switching modes converts the
    // content rather than leaving two divergent copies of the same message.
    const contentHtml = bodyMode === 'rich' ? bodyHtml : textToHtml(body)
    const contentText = bodyMode === 'rich' ? htmlToPlainText(bodyHtml) : body

    if (!template) {
      return { html: contentHtml, text: contentText }
    }

    const defaultVars: Record<string, string> = {
      COMPANY_NAME: COMPANY.brandName,
      COMPANY_ADDRESS: [COMPANY.addressLine2, COMPANY.addressLine1].filter(Boolean).join(', '),
      COMPANY_PHONE: COMPANY.phone,
      COMPANY_EMAIL: COMPANY.supportEmail,
      WEBSITE: COMPANY.website,
      CURRENT_DATE: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      CUSTOMER_NAME: '',
      CUSTOMER_EMAIL: to[0] ?? '',
      CONTENT: '',
    }

    const contentHtmlRemoved = textToHtml(body)

    let html = template.bodyHtml
    let text = template.bodyText ?? ''

    Object.entries(TEMPLATE_VARIABLES).forEach(([key, token]) => {
      if (key === 'CONTENT') return
      const value = defaultVars[key] ?? ''
      html = html.split(token).join(value)
      text = text.split(token).join(value)
    })

    html = html.split('{{content}}').join(contentHtml)
    text = text.split('{{content}}').join(contentText)

    return { html, text }
  }, [body, bodyHtml, bodyMode, selectedTemplateId, getTemplate, to])

  // ── Send ────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!emailAliasId) {
      showError('No email alias is configured for this account')
      return
    }
    if (to.length === 0) {
      showError('Add at least one recipient')
      return
    }
    if (!subject.trim()) {
      showError('Add a subject')
      return
    }

    setSending(true)
    try {
      const uploaded = await uploadPending()
      const attachmentsForSend = uploaded.length > 0 ? uploaded : []

      // Same builder the preview uses, so preview === sent.
      const { html: finalBodyHtml, text: finalBodyText } = buildEmailContent()

      await emailOutboundService.sendEmail(emailAliasId, {
        aliasId: emailAliasId,
        recipientEmail: to.join(', '),
        cc,
        bcc,
        subject,
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        attachments: attachmentsForSend,
      })

      if (draftId) await emailOutboundService.softDelete(draftId)

      setTo([])
      setCc([])
      setBcc([])
      setSubject('')
      setBody('')
      setBodyHtml('')
      setAttachments([])
      setDraftId(null)
      setDraftSavedAt(null)

      showSuccess(`Email sent to ${to.join(', ')}`)
      window.dispatchEvent(new Event('mailbox-changed'))
      navigate('/sent')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }, [emailAliasId, to, subject, hasBody, cc, bcc, draftId, uploadPending, buildEmailContent, showError, showSuccess, navigate])

  const handleSaveDraft = useCallback(async () => {
    if (!emailAliasId) return
    if (!subject.trim() && !hasBody) {
      showInfo('Nothing to save yet')
      return
    }
    await autosaveDraft()
    showSuccess('Draft saved')
  }, [emailAliasId, subject, body, autosaveDraft, showSuccess, showInfo])

  const handleDiscard = useCallback(async () => {
    const ok = await confirm({
      title: 'Discard message',
      message: 'This message has not been sent. Discard it?',
      confirmLabel: 'Discard',
      variant: 'danger',
    })
    if (!ok) return
    navigate('/inbox')
  }, [confirm, navigate])

  /**
   * The document rendered in the preview pane. Wrapping the outgoing HTML in a
   * full document matters when no template is selected, because the bare
   * output of textToHtml has no <body> or default styling.
   */
  const previewDocument = useMemo(() => {
    const { html } = buildEmailContent()

    // A template supplies its own complete document.
    if (html.trimStart().toLowerCase().startsWith('<!doctype')) {
      return html
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body {
    margin:0;
    padding:24px 16px;
    background:#ffffff;
    font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size:15px;
    line-height:1.7;
    color:#374151;
    -webkit-font-smoothing:antialiased;
  }
  a { color:#0284c7; }
  p { margin:0 0 14px; }
  ul { padding-left:22px; margin:0 0 14px; }
  li { margin:5px 0; }
  blockquote {
    margin:14px 0;
    padding:8px 14px;
    border-left:3px solid #cbd5e1;
    color:#64748b;
  }
  code {
    background:#f1f5f9;
    padding:2px 5px;
    border-radius:3px;
    font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size:13px;
  }
  img { max-width:100%; height:auto; }
</style>
</head>
<body>${html}</body>
</html>`
  }, [buildEmailContent])

  const draftStatusText = savingDraft
    ? 'Saving draft…'
    : draftSavedAt
      ? `Draft saved ${new Date(draftSavedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
      : ''

  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0)

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: colors.canvas }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{
          height: 56,
          padding: '0 16px',
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <IconButton label="Back to inbox" size={34} onClick={() => navigate('/inbox')}>
          <ArrowLeft size={18} />
        </IconButton>

        {/* min-w-0 + flex-1 lets the title collapse so the action buttons stay
            on screen. Without it the three buttons pushed Send past the right
            edge at 390px, making the primary action unreachable on a phone. */}
        <div className="flex flex-col min-w-0 flex-1">
          <h1
            className="font-semibold truncate"
            style={{ fontSize: fontSize.lg, color: colors.textPrimary }}
          >
            {replyToId ? 'Reply' : 'New message'}
          </h1>
          {draftStatusText && (
            <span className="tabular truncate" style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
              {draftStatusText}
            </span>
          )}
        </div>

        {/* Save draft is redundant on a phone — the autosave debounce already
            writes the draft, and the status line above reports it. */}
        <div className="hidden sm:block">
          <Button variant="secondary" size="sm" onClick={handleSaveDraft} loading={savingDraft}>
            Save draft
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDiscard}
          aria-label="Discard message"
          leadingIcon={<Trash2 size={15} />}
        >
          <span className="hidden sm:inline">Discard</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSend}
          loading={sending}
          leadingIcon={<Send size={15} />}
        >
          Send
        </Button>
      </div>

      {/* Editor.

          Full-bleed surface, not a card. It used to sit in a 24px-padded
          canvas inside a bordered, shadowed 820px panel with further padding
          on every field, so the whole screen read as a floating dialog
          stacked on top of the app. Mail clients treat compose as a surface,
          not a modal: one flat background, hairline row dividers, and a
          max-width only to keep lines readable on a wide monitor. */}
      <div
        className="flex-1 overflow-y-auto min-h-0 scrollbar-thin"
        style={{ backgroundColor: colors.surface }}
      >
        <div className="mx-auto w-full flex flex-col" style={{ maxWidth: 860 }}>
          {/* From */}
          <div
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ borderBottom: `1px solid ${colors.divider}` }}
          >
            <label className="flex-shrink-0 w-[58px]" style={{ fontSize: fontSize.base, color: colors.textSecondary }}>
              From
            </label>
            <span className="text-sm truncate" style={{ color: colors.textPrimary }}>
              {user?.email ?? '—'}
            </span>
          </div>

          <RecipientInput label="To" value={to} onChange={setTo} placeholder="name@example.com" />
          {showCc && <RecipientInput label="Cc" value={cc} onChange={setCc} placeholder="cc@example.com" />}
          {showBcc && <RecipientInput label="Bcc" value={bcc} onChange={setBcc} placeholder="bcc@example.com" />}

          {/* Cc / Bcc toggles */}
          <div
            className="flex items-center gap-4 px-4 py-1.5"
            style={{ borderBottom: `1px solid ${colors.divider}` }}
          >
            <button
              type="button"
              onClick={() => setShowCc((v) => !v)}
              className="text-xs font-medium cursor-pointer transition-colors"
              style={{ color: colors.textSecondary }}
            >
              Cc
            </button>
            <button
              type="button"
              onClick={() => setShowBcc((v) => !v)}
              className="text-xs font-medium cursor-pointer transition-colors"
              style={{ color: colors.textSecondary }}
            >
              Bcc
            </button>
          </div>

          {/* Subject */}
          <div
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ borderBottom: `1px solid ${colors.divider}` }}
          >
            <label className="flex-shrink-0 w-[58px]" style={{ fontSize: fontSize.base, color: colors.textSecondary }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              placeholder="What is this about?"
              className="flex-1 bg-transparent outline-none min-w-0"
              style={{ fontSize: fontSize.base, color: colors.textPrimary }}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Markdown shortcuts — only meaningful in plain-text mode. In rich mode the
              editor carries its own toolbar and these buttons would silently
              do nothing, because they edit `body` while rich mode owns
              `bodyHtml`. */}
          {editorMode === 'write' && bodyMode === 'text' && (
          <div
            className="flex items-center gap-0.5 px-3 py-1.5"
            style={{ borderBottom: `1px solid ${colors.divider}`, backgroundColor: colors.surfaceHover }}
          >
            <IconButton label="Bold" size={30} onClick={() => wrapSelection('**')}>
              <Bold size={15} />
            </IconButton>
            <IconButton label="Italic" size={30} onClick={() => wrapSelection('*')}>
              <Italic size={15} />
            </IconButton>
            <IconButton label="Insert link" size={30} onClick={insertLink}>
              <LinkIcon size={15} />
            </IconButton>

            <span className="mx-1.5" style={{ width: 1, height: 18, backgroundColor: colors.divider }} />

            <IconButton label="Bulleted list" size={30} onClick={() => prefixLines('- ')}>
              <ListIcon size={15} />
            </IconButton>
            <IconButton label="Numbered list" size={30} onClick={() => prefixLines('1. ')}>
              <ListOrdered size={15} />
            </IconButton>
            <IconButton label="Quote" size={30} onClick={() => prefixLines('> ')}>
              <Quote size={15} />
            </IconButton>
            <IconButton label="Inline code" size={30} onClick={() => wrapSelection('`')}>
              <Code size={15} />
            </IconButton>

            <div className="flex-1" />
          </div>
          )}

          {/* Template picker. Its own row because it applies to both editor
              modes — it used to live inside the markdown toolbar and so
              vanished entirely in rich mode. */}
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{ borderBottom: `1px solid ${colors.divider}`, backgroundColor: colors.surfaceHover }}
          >
            <span style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>Template</span>
            <select
              value={selectedTemplateId ?? ''}
              onChange={(e) => selectTemplate(e.target.value || null)}
              aria-label="Email template"
              className="cursor-pointer outline-none rounded-md px-2 py-1 text-xs"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                maxWidth: 200,
              }}
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Write / Preview toggle */}
          <div
            className="flex items-center gap-0.5 px-3 py-1.5"
            style={{ borderBottom: `1px solid ${colors.divider}`, backgroundColor: colors.surfaceHover }}
          >
            {([
              { key: 'write', label: 'Write', Icon: PenSquare },
              { key: 'preview', label: 'Preview', Icon: Eye },
            ] as const).map(({ key, label, Icon }) => {
              const active = editorMode === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEditorMode(key)}
                  aria-pressed={active}
                  className="flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                  style={{
                    height: 28,
                    padding: '0 11px',
                    borderRadius: radius.sm,
                    fontSize: fontSize.sm,
                    backgroundColor: active ? colors.surface : 'transparent',
                    color: active ? colors.textPrimary : colors.textSecondary,
                    boxShadow: active ? '0 1px 2px rgb(15 23 42 / 0.08)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              )
            })}

            <div className="flex-1" />

            {/* Rich / plain switch. Converting between them is lossy in one
                direction (alignment does not exist in plain text), so the
                conversion happens on the switch rather than being shared. */}
            {editorMode === 'write' && (
              <div
                className="flex items-center gap-0.5 p-0.5 rounded-lg"
                style={{ backgroundColor: colors.surface }}
                role="group"
                aria-label="Editor mode"
              >
                {([
                  { key: 'rich', label: 'Rich text' },
                  { key: 'text', label: 'Plain text' },
                ] as const).map(({ key, label }) => {
                  const active = bodyMode === key
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        if (key === 'text') {
                          setBody(htmlToPlainText(bodyHtml))
                          setBodyHtml('')
                        } else {
                          setBodyHtml(textToHtml(body))
                          setBody('')
                        }
                        setBodyMode(key)
                      }}
                      className="font-medium transition-colors cursor-pointer"
                      style={{
                        height: 26,
                        padding: '0 10px',
                        borderRadius: radius.sm,
                        fontSize: fontSize.xs,
                        border: 'none',
                        backgroundColor: active ? colors.surfaceSubtle : 'transparent',
                        color: active ? colors.textPrimary : colors.textTertiary,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Body: source or rendered preview */}
          {editorMode === 'write' ? (
            bodyMode === 'rich' ? (
              <RichTextEditor
                value={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Write your message…"
                minHeight={300}
              />
            ) : (
              <textarea
                ref={bodyRef}
                value={body}
                placeholder={`Write your message…\n\nFormatting: **bold**, *italic*, \`code\`, > quote, - list\nLinks are detected automatically.\n\nUse Preview to see the message as the recipient will.`}
                className="w-full bg-transparent outline-none resize-none px-4 py-3"
                style={{
                  fontSize: fontSize.md,
                  lineHeight: 1.7,
                  color: colors.textPrimary,
                  minHeight: 300,
                  fontFamily: 'inherit',
                }}
                onChange={(e) => setBody(e.target.value)}
              />
            )
          ) : (
            <div
              className="flex flex-col min-h-0"
              style={{ backgroundColor: colors.canvas, minHeight: 300 }}
            >
              {!hasBody ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center text-center"
                  style={{ padding: '48px 24px' }}
                >
                  <Eye size={24} style={{ color: colors.textTertiary, marginBottom: 12 }} />
                  <p style={{ fontSize: fontSize.base, color: colors.textSecondary }}>
                    Nothing to preview yet
                  </p>
                  <p
                    className="mt-1"
                    style={{ fontSize: fontSize.sm, color: colors.textTertiary }}
                  >
                    Switch back to Write and start typing.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="flex-1 overflow-auto min-h-0 scrollbar-thin"
                    style={{ padding: 20 }}
                  >
                    {/* Sandboxed iframe: renders the exact HTML that will be
                        sent, isolated from app styles. */}
                    <iframe
                      title="Message preview"
                      srcDoc={previewDocument}
                      sandbox=""
                      className="border-0 rounded-lg"
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 400,
                        backgroundColor: '#ffffff',
                        border: `1px solid ${colors.border}`,
                      }}
                    />
                  </div>
                  <div
                    className="flex items-center gap-2 px-4 py-2"
                    style={{ borderTop: `1px solid ${colors.divider}` }}
                  >
                    <span style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
                      This is exactly what the recipient will see.
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Attachments */}
          <div style={{ borderTop: `1px solid ${colors.divider}` }}>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-md"
                    style={{
                      backgroundColor: a.failed ? colors.errorBg : colors.surfaceSubtle,
                      fontSize: fontSize.sm,
                      maxWidth: 260,
                    }}
                  >
                    <Paperclip size={13} style={{ color: a.failed ? colors.error : colors.textSecondary }} />
                    <span className="truncate" style={{ color: colors.textPrimary }} title={a.name}>
                      {a.name}
                    </span>
                    <span className="tabular flex-shrink-0" style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
                      {a.uploading ? 'uploading…' : formatFileSize(a.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      aria-label={`Remove ${a.name}`}
                      className="flex items-center justify-center rounded cursor-pointer flex-shrink-0"
                      style={{ width: 18, height: 18, color: colors.textSecondary }}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                backgroundColor: dragging ? colors.selected : 'transparent',
                transition: 'background-color 120ms',
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leadingIcon={<Paperclip size={15} />}
              >
                Attach files
              </Button>

              <span className="text-xs truncate" style={{ color: colors.textTertiary }}>
                {dragging
                  ? 'Drop to attach'
                  : `Up to 10 MB each, 100 MB total${totalSize > 0 ? ` · ${formatFileSize(totalSize)}` : ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  )
}