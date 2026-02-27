import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Trash2, File, Paperclip, Bold, Italic, Underline, List } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'

interface EmailAttachment {
  id: string
  name: string
  size: number
  type: string
  file?: File
}

interface DraftData {
  recipient_email: string
  cc: string[]
  bcc: string[]
  subject: string
  body_html: string
  body_text: string
  attachments: EmailAttachment[]
}

export default function ComposeView() {
  const navigate = useNavigate()
  const { emailAliasId, user } = useAuthStore()

  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<EmailAttachment[]>([])
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Rich text editor commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  // Autosave draft
  const autosaveDraft = async () => {
    if (!emailAliasId || (!to && !subject && !body)) return

    setSavingDraft(true)

    try {
      const draftData: DraftData = {
        recipient_email: to,
        cc: cc ? [cc] : [],
        bcc: bcc ? [bcc] : [],
        subject,
        body_html: body.replace(/\n/g, '<br>'),
        body_text: body,
        attachments: attachments.map(a => ({
          id: a.id,
          name: a.name,
          size: a.size,
          type: a.type
        }))
      }

      if (draftId) {
        // Update existing draft
        await supabase
          .from('email_drafts')
          .update({
            ...draftData,
            updated_at: new Date().toISOString(),
            last_auto_saved_at: new Date().toISOString()
          })
          .eq('id', draftId)
      } else {
        // Create new draft
        const { data } = await supabase
          .from('email_drafts')
          .insert({
            alias_id: emailAliasId,
            ...draftData,
          })
          .select()
          .single()

        if (data) {
          setDraftId(data.id)
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setSavingDraft(false)
    }
  }

  // Setup autosave
  useEffect(() => {
    // Clear any existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    // Set new timer to autosave after 2 seconds of inactivity
    autosaveTimerRef.current = setTimeout(autosaveDraft, 2000)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [to, cc, bcc, subject, body, attachments])

  // Load draft data from sessionStorage if editing a draft
  useEffect(() => {
    const editDraftData = sessionStorage.getItem('editDraft')
    if (editDraftData) {
      try {
        const draft = JSON.parse(editDraftData)
        setTo(draft.recipient_email || '')
        setCc(draft.cc?.[0] || '')
        setBcc(draft.bcc?.[0] || '')
        setSubject(draft.subject || '')
        setBody(draft.body_html || draft.body_text || '')
        setDraftId(draft.id)
        setShowCc(!!draft.cc?.length)
        setShowBcc(!!draft.bcc?.length)

        // Clear sessionStorage after loading
        sessionStorage.removeItem('editDraft')
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [])

  const handleSend = async () => {
    if (!emailAliasId) {
      alert('No email alias configured')
      return
    }

    if (!to || !subject) {
      alert('Please fill in recipient and subject')
      return
    }

    setSending(true)

    try {
      // Get alias details
      const { data: alias } = await supabase
        .from('email_aliases')
        .select('alias_email')
        .eq('id', emailAliasId)
        .single()

      // Store in email_outbound as pending
      const { error } = await supabase
        .from('email_outbound')
        .insert({
          alias_id: emailAliasId,
          recipient_email: to,
          cc: cc ? [cc] : [],
          bcc: bcc ? [bcc] : [],
          subject,
          body_html: body.replace(/\n/g, '<br>'),
          body_text: body,
          status: 'pending',
        })

      if (error) throw error

      // Delete draft after sending
      if (draftId) {
        await supabase.from('email_drafts').delete().eq('id', draftId)
        setDraftId(null)
      }

      // Reset form
      setTo('')
      setCc('')
      setBcc('')
      setSubject('')
      setBody('')
      setAttachments([])

      navigate('/sent')
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newAttachments: EmailAttachment[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`)
        continue
      }

      newAttachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        file
      })
    }

    setAttachments([...attachments, ...newAttachments])
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id))
  }

  const handleDiscard = async () => {
    if (draftId) {
      await supabase.from('email_drafts').delete().eq('id', draftId)
    }

    navigate(-1)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">New Message</h1>
        <div className="flex items-center gap-2">
          {draftId && (
            <span className="text-xs text-gray-500">Draft saved</span>
          )}
          <button
            onClick={handleDiscard}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Discard
          </button>
        </div>
      </div>

      {/* Compose Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Recipients */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* To */}
            <div className="flex items-center px-4 py-2 border-b border-gray-100">
              <label className="w-16 text-sm font-medium text-gray-600">To:</label>
              <div className="flex-1 flex items-center">
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 px-3 py-1.5 border-0 focus:ring-0 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => setShowCc(!showCc)}
                  className="text-xs text-blue-600 hover:underline mr-2"
                >
                  {showCc ? 'Hide' : 'Cc'}
                </button>
                <button
                  onClick={() => setShowBcc(!showBcc)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showBcc ? 'Hide' : 'Bcc'}
                </button>
              </div>
            </div>

            {/* CC */}
            {showCc && (
              <div className="flex items-center px-4 py-2 border-b border-gray-100">
                <label className="w-16 text-sm font-medium text-gray-600">Cc:</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 px-3 py-1.5 border-0 focus:ring-0 text-sm"
                />
              </div>
            )}

            {/* BCC */}
            {showBcc && (
              <div className="flex items-center px-4 py-2">
                <label className="w-16 text-sm font-medium text-gray-600">Bcc:</label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 px-3 py-1.5 border-0 focus:ring-0 text-sm"
                />
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-4 py-3 border-0 focus:ring-0 font-medium"
            />
          </div>

          {/* Rich Text Editor Toolbar */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-1">
              <button
                onClick={() => execCommand('bold')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => execCommand('italic')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => execCommand('underline')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-4 h-4 text-gray-700" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => execCommand('insertUnorderedList')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Bullet List"
              >
                <List className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* Content Editable */}
            <div
              contentEditable
              onInput={(e) => setBody(e.currentTarget.innerHTML)}
              className="w-full px-4 py-3 min-h-[300px] focus:outline-none"
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: body || '<p><br></p>' }}
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Attachments</span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <File className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Attachment Button */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Paperclip className="w-4 h-4 text-gray-600" />
              Attach Files
            </button>
            {savingDraft && (
              <span className="text-sm text-gray-500">Saving...</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          From: {user?.email}
        </p>
        <button
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
