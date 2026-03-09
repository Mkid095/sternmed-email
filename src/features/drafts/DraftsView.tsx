import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { File, Edit, Trash2, RefreshCw, Search } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { CloseIcon } from '../../components/icons'
import type { EmailOutbound } from '../../types'

export default function DraftsView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  const [drafts, setDrafts] = useState<EmailOutbound[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const fetchDrafts = useCallback(async (pageNum: number, search: string = '', reset: boolean = true) => {
    if (!emailAliasId) return

    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const result = await emailOutboundService.getOutboundEmails(emailAliasId, {
        page: pageNum,
        pageSize: 20,
        status: 'pending',
      })

      let filtered = result.data
      if (search.trim()) {
        const query = search.toLowerCase()
        filtered = result.data.filter(draft =>
          draft.subject?.toLowerCase().includes(query) ||
          draft.recipientEmail?.toLowerCase().includes(query) ||
          draft.cc?.some(cc => cc.toLowerCase().includes(query)) ||
          draft.bcc?.some(bcc => bcc.toLowerCase().includes(query))
        )
      }

      if (reset || pageNum === 1) {
        setDrafts(filtered)
      } else {
        setDrafts(prev => [...prev, ...filtered])
      }

      setHasMore(result.hasMore)
      setTotalCount(filtered.length)
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emailAliasId])

  useEffect(() => {
    setPage(1)
    fetchDrafts(1, debouncedSearch, true)
  }, [emailAliasId, debouncedSearch, fetchDrafts])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchDrafts(nextPage, debouncedSearch, false)
  }

  const deleteDraft = async (id: string) => {
    const result = await confirm({
      title: 'Delete Draft',
      message: 'Permanently delete this draft?',
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

  const editDraft = (draft: EmailOutbound) => {
    sessionStorage.setItem('editDraft', JSON.stringify(draft))
    navigate('/compose')
  }

  const selectedDraft = drafts.find(d => d.id === selectedId)

  const formatRecipients = (draft: EmailOutbound) => {
    const recipients = [draft.recipientEmail, ...(draft.cc || []), ...(draft.bcc || [])]
    return recipients.filter(Boolean).join(', ')
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              Drafts
              {totalCount > 0 && (
                <span className="ml-2 text-lg font-normal" style={{ color: colors.textSecondary }}>
                  {totalCount}
                </span>
              )}
            </h1>
            <button
              onClick={() => fetchDrafts(page, debouncedSearch, false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: colors.textSecondary }}
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: colors.textTertiary }} />
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full text-sm outline-none"
              style={{
                backgroundColor: colors.searchBackground,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: colors.textSecondary }}>
            <File size={64} className="mb-4 opacity-30" />
            <p className="text-lg">{debouncedSearch ? 'No drafts match your search' : 'No drafts yet'}</p>
            <p className="text-sm mt-2 opacity-70">Drafts are saved automatically</p>
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

            <div className="divide-y" style={{ borderColor: colors.divider }}>
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => setSelectedId(draft.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedId === draft.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                  }`}
                  style={{
                    backgroundColor: selectedId === draft.id ? colors.selected : undefined,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium truncate"
                        style={{ color: colors.textPrimary }}
                      >
                        {draft.subject || '(No subject)'}
                      </p>
                      <p className="text-sm truncate mt-1" style={{ color: colors.textSecondary }}>
                        To: {formatRecipients(draft)}
                      </p>
                    </div>
                    <span className="text-xs flex-shrink-0 ml-2" style={{ color: colors.textTertiary }}>
                      {format(new Date(draft.updatedAt || draft.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {draft.attachments && draft.attachments.length > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                      >
                        {draft.attachments.length} attachment{draft.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: colors.textTertiary }}>
                      Saved {format(new Date(draft.updatedAt || draft.createdAt), 'h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="p-4 border-t" style={{ borderColor: colors.divider }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    color: colors.primary,
                    backgroundColor: loadingMore ? colors.surfaceHover : 'transparent',
                  }}
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }} />
                      Loading...
                    </span>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}
        >
          <div
            className="rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
          >
            <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                  {selectedDraft.subject || '(No subject)'}
                </h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  style={{ color: colors.textSecondary }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium w-16" style={{ color: colors.textSecondary }}>To:</span>
                  <span style={{ color: colors.textPrimary }}>{selectedDraft.recipientEmail}</span>
                </div>
                {selectedDraft.cc && selectedDraft.cc.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-16" style={{ color: colors.textSecondary }}>Cc:</span>
                    <span style={{ color: colors.textPrimary }}>{selectedDraft.cc.join(', ')}</span>
                  </div>
                )}
              </div>

              {selectedDraft.attachments && selectedDraft.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.divider }}>
                  <p className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDraft.attachments.map((att, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                        style={{ backgroundColor: colors.searchBackground, color: colors.textPrimary }}
                      >
                        <File size={14} />
                        {att.filename}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs mt-4" style={{ color: colors.textTertiary }}>
                Last saved: {format(new Date(selectedDraft.updatedAt || selectedDraft.createdAt), 'PPPPp')}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedDraft.bodyHtml ? (
                <div
                  className="prose max-w-none"
                  style={{ color: colors.textPrimary }}
                  dangerouslySetInnerHTML={{ __html: selectedDraft.bodyHtml }}
                />
              ) : (
                <div className="whitespace-pre-wrap" style={{ color: colors.textPrimary }}>
                  {selectedDraft.bodyText}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-2" style={{ borderColor: colors.divider }}>
              <button
                onClick={() => {
                  deleteDraft(selectedDraft.id)
                  setSelectedId(null)
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
              >
                <Trash2 size={16} className="inline mr-2" />
                Delete
              </button>
              <button
                onClick={() => {
                  editDraft(selectedDraft)
                  setSelectedId(null)
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: colors.primary }}
              >
                <Edit size={16} className="inline mr-2" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
