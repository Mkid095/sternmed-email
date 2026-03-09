import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { type EmailOutbound } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { File, Trash2, Edit, Clock, Search, RefreshCw } from 'lucide-react'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

/**
 * DraftsView Component
 *
 * Displays saved email drafts (from email_outbound with status='pending')
 * with options to:
 * - Edit a draft (navigates to compose with draft data)
 * - Delete a draft
 * - View draft preview
 * - Search drafts
 * - Pagination with "Load More"
 */
export default function DraftsView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { confirm, confirmation } = useConfirmationModal()

  // Data state
  const [drafts, setDrafts] = useState<EmailOutbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Pagination state
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch drafts for the current email alias (using email_outbound with status='pending')
  const fetchDrafts = useCallback(async (pageNum: number, searchQuery: string = '', reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const result = await emailOutboundService.getOutboundEmails(emailAliasId, {
        page: pageNum,
        pageSize: 20,
        status: 'pending',
      })

      // Apply search filter on client
      let filteredDrafts = result.data
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filteredDrafts = result.data.filter(draft =>
          draft.subject?.toLowerCase().includes(query) ||
          draft.recipientEmail?.toLowerCase().includes(query) ||
          draft.cc?.some(cc => cc.toLowerCase().includes(query)) ||
          draft.bcc?.some(bcc => bcc.toLowerCase().includes(query))
        )
      }

      if (reset || pageNum === 1) {
        setDrafts(filteredDrafts)
      } else {
        setDrafts(prev => [...prev, ...filteredDrafts])
      }

      setHasMore(result.hasMore)
      setTotalCount(filteredDrafts.length)
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  // Initial load and page changes
  useEffect(() => {
    setPage(1)
    fetchDrafts(1, debouncedSearch, true)
  }, [emailAliasId, debouncedSearch, fetchDrafts])

  // Load more handler
  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchDrafts(nextPage, debouncedSearch, false)
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Delete a draft
  const deleteDraft = async (id: string) => {
    const result = await confirm({
      title: 'Delete Draft',
      message: 'Are you sure you want to delete this draft? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })

    if (!result) return

    try {
      await emailOutboundService.softDelete(id)
      setDrafts(prev => prev.filter(d => d.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch (error) {
      console.error('Error deleting draft:', error)
      alert('Failed to delete draft')
    }
  }

  // Edit a draft - navigate to compose with draft data
  const editDraft = (draft: EmailOutbound) => {
    // Store draft data in sessionStorage for compose to pick up
    sessionStorage.setItem('editDraft', JSON.stringify(draft))
    navigate('/compose')
  }

  // Format recipient list for display
  const formatRecipients = (draft: EmailOutbound) => {
    const recipients = [draft.recipientEmail, ...(draft.cc || []), ...(draft.bcc || [])]
    return recipients.filter(Boolean).join(', ')
  }

  const selectedDraft = drafts.find(d => d.id === selectedId) as EmailOutbound | undefined

  // Format file size for attachments
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Drafts {totalCount > 0 && <span className="text-lg font-normal text-gray-500">({totalCount})</span>}
            </h1>
            <button
              onClick={() => fetchDrafts(page, debouncedSearch, false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Drafts List */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <File className="w-16 h-16 mb-4" />
            <p>{debouncedSearch ? 'No drafts match your search' : 'No drafts yet'}</p>
            <p className="text-sm mt-1">Start composing and your drafts will be saved automatically</p>
          </div>
        ) : (
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
                      {format(new Date(draft.updatedAt || draft.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>

                  {/* Draft preview */}
                  <div className="flex items-center gap-2 mt-2">
                    {draft.attachments && draft.attachments.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {draft.attachments.length} attachment{draft.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      Saved {format(new Date(draft.updatedAt || draft.createdAt), 'h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Draft Preview Panel */}
      {selectedDraft && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedDraft.subject || '(No subject)'}
                </h1>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600 w-16">To:</span>
                  <span className="text-gray-900">{selectedDraft.recipientEmail}</span>
                </div>
                {selectedDraft.cc && selectedDraft.cc.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 w-16">Cc:</span>
                    <span className="text-gray-900">{selectedDraft.cc.join(', ')}</span>
                  </div>
                )}
                {selectedDraft.bcc && selectedDraft.bcc.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 w-16">Bcc:</span>
                    <span className="text-gray-900">{selectedDraft.bcc.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedDraft?.attachments && selectedDraft.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDraft.attachments.map((attachment) => (
                      <span
                        key={attachment.filename}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700"
                      >
                        <File className="w-4 h-4" />
                        {attachment.filename}
                        <span className="text-gray-400">({formatFileSize(attachment.size)})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4">
                Last saved: {format(new Date(selectedDraft?.updatedAt || selectedDraft?.createdAt), 'PPPPp')}
              </p>
            </div>

            {/* Body Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDraft?.bodyHtml ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedDraft.bodyHtml }}
                />
              ) : selectedDraft?.bodyText ? (
                <div className="whitespace-pre-wrap text-gray-800">{selectedDraft.bodyText}</div>
              ) : (
                <p className="text-gray-500 italic">No content</p>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  deleteDraft(selectedDraft.id)
                  setSelectedId(null)
                }}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => {
                  editDraft(selectedDraft)
                  setSelectedId(null)
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
