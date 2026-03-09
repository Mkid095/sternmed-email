/**
 * Compose Window Manager
 *
 * Manages multiple floating compose windows.
 * Handles opening, closing, minimizing, restoring, and z-index stacking.
 *
 * @module features/compose/ComposeWindowManager
 */

import React, { useMemo, useCallback } from 'react'
import { X, Minus } from 'lucide-react'
import { useComposeForm } from './useComposeForm'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useToastSuccess, useToastError } from '../shared/ui'
import { useComposeStore } from './useComposeStore'
import type { ComposeWindow } from './useComposeStore'

/**
 * Props for individual ComposeWindow (internal)
 */
interface ComposeWindowProps {
  win: ComposeWindow
  onClose: () => void
  onMinimize: () => void
  onRestore: () => void
  onActivate: () => void
}

/**
 * Individual Compose Window Component
 *
 * Renders a floating window with a header (title, minimize, close) and a compose form.
 * When minimized, shows only a small bar at bottom-right.
 */
function ComposeWindow({ win, onClose, onMinimize, onRestore, onActivate }: ComposeWindowProps) {
  const { form, sending, savingDraft, handleInputChange, handleFileSelect, removeAttachment, sendEmail, saveAsDraft, resetForm, formatFileSize } =
    useComposeForm({ initialValues: win.initialData })

  const showSuccess = useToastSuccess()
  const showError = useToastError()

  // Get user's email alias ID for draft updates
  const emailAliasId = useAuthStore((state) => state.emailAliasId)

  /**
   * Handle form submission (Send)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await sendEmail()
    if (success) {
      onClose()
    }
  }

  /**
   * Handle save draft
   */
  const handleSaveDraft = async () => {
    if (win.draftId) {
      // Update existing draft
      if (!emailAliasId) {
        showError('No email alias configured')
        return
      }
      try {
        await emailOutboundService.updateDraft(win.draftId, emailAliasId, {
          recipientEmail: form.to[0] || '',
          cc: form.cc,
          bcc: form.bcc,
          subject: form.subject,
          bodyText: form.body,
          bodyHtml: form.body.replace(/\n/g, '<br>'),
        })
        showSuccess('Draft saved')
        onClose()
        // Refresh lists (drafts, etc.)
        window.dispatchEvent(new Event('email-deleted'))
      } catch (error) {
        console.error('Failed to update draft:', error)
        showError('Failed to save draft')
      }
    } else {
      // Create new draft
      const success = await saveAsDraft()
      if (success) {
        onClose()
        window.dispatchEvent(new Event('email-deleted'))
      }
    }
  }

  /**
   * Handle cancel (close without sending)
   */
  const handleCancel = () => {
    resetForm()
    onClose()
  }

  // If minimized, render minimized bar
  if (win.minimized) {
    return (
      <div
        className="fixed bottom-4 right-4 w-64 bg-white border border-gray-200 rounded-lg shadow-lg cursor-pointer overflow-hidden z-50"
        style={{ zIndex: win.zIndex }}
        onClick={() => {
          onRestore()
          onActivate()
        }}
      >
        <div className="p-2 font-medium text-sm truncate text-gray-800">
          {form.subject || 'New Message'}
        </div>
      </div>
    )
  }

  // Full window
  return (
    <div
      className="fixed flex flex-col rounded-lg shadow-2xl overflow-hidden border border-gray-200 bg-white"
      style={{
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
      }}
      onClick={onActivate}
      role="dialog"
      aria-modal="true"
      aria-label="Compose email"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
        <span className="font-medium truncate text-gray-800">
          {form.subject || 'New Message'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600"
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600"
            title="Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
        {/* To field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.to.join(', ')}
            onChange={(e) => handleInputChange('to', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="recipient@example.com"
          />
        </div>

        {/* CC & BCC */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
            <input
              type="text"
              value={form.cc.join(', ')}
              onChange={(e) => handleInputChange('cc', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="cc@example.com (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
            <input
              type="text"
              value={form.bcc.join(', ')}
              onChange={(e) => handleInputChange('bcc', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="bcc@example.com (optional)"
            />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Message subject"
          />
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={form.body}
            onChange={(e) => handleInputChange('body', e.target.value)}
            className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono"
            placeholder="Type your message here..."
            rows={10}
          />
        </div>

        {/* Attachments */}
        {form.attachments.length > 0 && (
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="text-sm font-medium text-gray-700 mb-2">Attachments</div>
            <div className="space-y-2">
              {form.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">📎</span>
                    <span className="text-sm text-gray-700 truncate max-w-xs">
                      {attachment.name}
                    </span>
                    <span className="text-xs text-gray-500">({formatFileSize(attachment.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachment button */}
        <div className="flex items-center gap-4">
          <input
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id={`file-upload-${win.id}`}
          />
          <label
            htmlFor={`file-upload-${win.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <span>📎</span>
            Add Attachments
          </label>
          <span className="text-xs text-gray-500">
            {form.attachments.length > 0
              ? `${form.attachments.length} file(s) attached`
              : ''}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || !form.subject}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Save Draft
          </button>
          <button
            type="submit"
            disabled={sending || !form.to.length || !form.subject}
            className={`px-6 py-2 text-sm text-white rounded-md font-medium transition-colors flex items-center gap-2 ${
              sending || !form.to.length || !form.subject
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * ComposeWindowManager Component
 *
 * Renders all active compose windows sorted by z-index.
 * Also renders minimized windows as bars at bottom-right.
 */
export function ComposeWindowManager() {
  const { windows, closeCompose, minimizeCompose, restoreCompose, bringToFront } = useComposeStore()

  // Sort windows by z-index so higher ones render last (on top)
  const sortedWindows = useMemo(
    () => [...windows].sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  )

  return (
    <React.Fragment>
      {sortedWindows.map((win) => (
        <ComposeWindow
          key={win.id}
          win={win}
          onClose={() => closeCompose(win.id)}
          onMinimize={() => minimizeCompose(win.id)}
          onRestore={() => restoreCompose(win.id)}
          onActivate={() => bringToFront(win.id)}
        />
      ))}
    </React.Fragment>
  )
}
