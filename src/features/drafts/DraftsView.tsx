import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { File, Trash2, Edit, Clock } from 'lucide-react'

/**
 * Draft email data structure from email_drafts table
 */
interface EmailDraft {
  id: string
  alias_id: string
  recipient_email: string
  cc: string[]
  bcc: string[]
  subject: string
  body_html: string
  body_text: string
  attachments: Array<{
    id: string
    name: string
    size: number
    type: string
  }>
  last_auto_saved_at: string
  updated_at: string
  created_at: string
}

/**
 * DraftsView Component
 *
 * Displays saved email drafts with options to:
 * - Edit a draft (navigates to compose with draft data)
 * - Delete a draft
 * - View draft preview
 */
export default function DraftsView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const [drafts, setDrafts] = useState<EmailDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  /**
   * Fetch drafts for the current email alias
   */
  const fetchDrafts = async () => {
    if (!emailAliasId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('email_drafts')
      .select('*')
      .eq('alias_id', emailAliasId)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching drafts:', error)
    } else {
      setDrafts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDrafts()
  }, [emailAliasId])

  /**
   * Delete a draft
   */
  const deleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return

    const { error } = await supabase
      .from('email_drafts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting draft:', error)
      alert('Failed to delete draft')
    } else {
      setDrafts(drafts.filter(d => d.id !== id))
      if (selectedId === id) setSelectedId(null)
    }
  }

  /**
   * Edit a draft - navigate to compose with draft data
   */
  const editDraft = (draft: EmailDraft) => {
    // Store draft data in sessionStorage for compose to pick up
    sessionStorage.setItem('editDraft', JSON.stringify(draft))
    navigate('/compose')
  }

  /**
   * Format recipient list for display
   */
  const formatRecipients = (draft: EmailDraft) => {
    const recipients = [draft.recipient_email, ...draft.cc, ...draft.bcc]
    return recipients.filter(Boolean).join(', ')
  }

  const selectedDraft = drafts.find(d => d.id === selectedId)

  /**
   * Format file size for attachments
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="flex h-full">
      {/* Drafts List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Drafts</h2>
          <button
            onClick={fetchDrafts}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <Clock className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Drafts List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <File className="w-12 h-12 mb-4" />
              <p>No drafts yet</p>
              <p className="text-sm mt-1">Start composing and your drafts will be saved automatically</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => setSelectedId(draft.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedId === draft.id
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {draft.subject || '(No subject)'}
                      </p>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        To: {formatRecipients(draft)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {format(new Date(draft.updated_at), 'MMM d, h:mm a')}
                    </span>
                  </div>

                  {/* Draft preview */}
                  <div className="flex items-center gap-2 mt-2">
                    {draft.attachments.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {draft.attachments.length} attachment{draft.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      Saved {format(new Date(draft.last_auto_saved_at), 'h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Draft Preview */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedDraft ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedDraft.subject || '(No subject)'}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editDraft(selectedDraft)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Draft
                  </button>
                  <button
                    onClick={() => deleteDraft(selectedDraft.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600 w-16">To:</span>
                  <span className="text-gray-900">{selectedDraft.recipient_email}</span>
                </div>
                {selectedDraft.cc.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 w-16">Cc:</span>
                    <span className="text-gray-900">{selectedDraft.cc.join(', ')}</span>
                  </div>
                )}
                {selectedDraft.bcc.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 w-16">Bcc:</span>
                    <span className="text-gray-900">{selectedDraft.bcc.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedDraft.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDraft.attachments.map((attachment) => (
                      <span
                        key={attachment.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700"
                      >
                        <File className="w-4 h-4" />
                        {attachment.name}
                        <span className="text-gray-400">({formatFileSize(attachment.size)})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4">
                Last saved: {format(new Date(selectedDraft.last_auto_saved_at), 'PPPPp')}
              </p>
            </div>

            {/* Body Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDraft.body_html ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedDraft.body_html }}
                />
              ) : selectedDraft.body_text ? (
                <div className="whitespace-pre-wrap text-gray-800">{selectedDraft.body_text}</div>
              ) : (
                <p className="text-gray-500 italic">No content</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <File className="w-16 h-16 mx-auto mb-4" />
              <p>Select a draft to preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
