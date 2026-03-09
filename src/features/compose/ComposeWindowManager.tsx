/**
 * Compose Window Manager
 *
 * Manages multiple floating compose windows.
 * Handles opening, closing, minimizing, restoring, and z-index stacking.
 *
 * @module features/compose/ComposeWindowManager
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { X, Minus } from 'lucide-react'
import { useComposeForm } from './useComposeForm'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useToastSuccess, useToastError } from '../shared/ui'
import { useComposeStore } from './useComposeStore'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../config/supabase'
import type { ComposeWindow } from './useComposeStore'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text?: string
  is_system: boolean
}

/**
 * Props for individual ComposeWindow (internal)
 */
interface ComposeWindowProps {
  win: ComposeWindow
  onClose: () => void
  onMinimize: () => void
  onRestore: () => void
  onActivate: () => void
  templates: EmailTemplate[]
}

/**
 * Individual Compose Window Component
 *
 * Renders a floating window with a header (title, minimize, close) and a compose form.
 * When minimized, shows only a small bar at bottom-right.
 */
function ComposeWindow({ win, onClose, onMinimize, onRestore, onActivate, templates }: ComposeWindowProps) {
  const { form, sending, savingDraft, handleInputChange, handleFileSelect, removeAttachment, sendEmail, saveAsDraft, resetForm, formatFileSize } =
    useComposeForm({ initialValues: win.initialData })

  const showSuccess = useToastSuccess()
  const showError = useToastError()

  // Get user's email alias ID for draft updates
  const emailAliasId = useAuthStore((state) => state.emailAliasId)
  const { colors } = useTheme()
  const updateWindowPosition = useComposeStore((state) => state.updateWindowPosition)

  // Company info for template placeholders (could come from user profile later)
  const companyInfo = {
    company_name: 'Sternmed Afrika',
    company_address: 'Nairobi, Kenya',
    company_phone: '+254 XXX XXX XXX',
    company_email: 'info@sternmed.co.ke',
    website: 'https://sternmed.co.ke',
    current_date: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }

  /**
   * Handle template selection from dropdown
   */
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value
    if (!templateId) {
      handleInputChange('template', '')
      return
    }

    const template = templates.find(t => t.id === templateId)
    if (!template) {
      showError('Template not found')
      return
    }

    // Replace placeholders in subject and body
    let subject = template.subject
    let bodyText = template.body_text || template.body_html.replace(/<[^>]*>/g, '')

    // Replace company variables
    Object.entries(companyInfo).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      bodyText = bodyText.replace(new RegExp(placeholder, 'g'), value)
    })

    // Also replace {{customer_name}} and {{customer_email}} with recipient if available
    if (form.to[0]) {
      const customerName = form.to[0].split('@')[0]
      subject = subject.replace(/\{\{customer_name\}\}/g, customerName)
      bodyText = bodyText.replace(/\{\{customer_name\}\}/g, customerName)
      bodyText = bodyText.replace(/\{\{customer_email\}\}/g, form.to[0])
    }

    handleInputChange('template', templateId)
    handleInputChange('subject', subject)
    handleInputChange('body', bodyText)
    showSuccess(`Applied template: ${template.name}`)
  }

  // Dragging state
  const [isDragging, setIsDragging] = useState(false)
  const windowRef = useRef<HTMLDivElement>(null)

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
    // Calculate position for stacked minimized windows
    const minimizedWindows = useComposeStore.getState().windows.filter(w => w.minimized)
    const index = minimizedWindows.findIndex(w => w.id === win.id)
    const stackOffset = index * 40 // Each bar is ~40px tall with spacing

    return (
      <div
        className="fixed bottom-4 right-4 w-80 rounded-lg shadow-lg cursor-pointer overflow-hidden z-50 border transition-all duration-200"
        style={{
          zIndex: win.zIndex,
          backgroundColor: colors.surface,
          borderColor: colors.divider,
          bottom: stackOffset,
        }}
        onClick={() => {
          onRestore()
          onActivate()
        }}
      >
        <div className="p-3 flex items-center gap-2" style={{ color: colors.textPrimary }}>
          <span className="flex-1 text-sm font-medium truncate">
            {form.subject || 'New Message'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}>
            Draft
          </span>
        </div>
      </div>
    )
  }

  // Full window
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking on the header
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    onActivate()
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !windowRef.current) return
    const x = e.clientX - win.position.x
    const y = e.clientY - win.position.y
    // Update window position
    const rect = windowRef.current.getBoundingClientRect()
    const newX = e.clientX - rect.width / 2
    const newY = e.clientY - rect.height / 2
    updateWindowPosition(win.id, newX, newY)
  }, [isDragging, win.id, win.position.x, win.position.y, updateWindowPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={windowRef}
      className="fixed flex flex-col rounded-lg shadow-2xl overflow-hidden border transition-all duration-200"
      style={{
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
        backgroundColor: colors.surface,
        borderColor: colors.divider,
      }}
      onClick={onActivate}
      role="dialog"
      aria-modal="true"
      aria-label="Compose email"
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-move"
        style={{ backgroundColor: colors.surfaceHover, borderBottom: `1px solid ${colors.divider}` }}
        onMouseDown={handleMouseDown}
      >
        <span className="font-medium truncate" style={{ color: colors.textPrimary }}>
          {form.subject || 'New Message'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMinimize()
            }}
            className="p-1 rounded transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="p-1 rounded transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.divider}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 overflow-y-auto" style={{ backgroundColor: colors.surface }}>
        {/* To field */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>To <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={form.to.join(', ')}
            onChange={(e) => handleInputChange('to', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: colors.searchBackground,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
            placeholder="recipient@example.com"
          />
        </div>

        {/* CC & BCC */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>CC</label>
            <input
              type="text"
              value={form.cc.join(', ')}
              onChange={(e) => handleInputChange('cc', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: colors.searchBackground,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
              placeholder="cc@example.com (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>BCC</label>
            <input
              type="text"
              value={form.bcc.join(', ')}
              onChange={(e) => handleInputChange('bcc', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: colors.searchBackground,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
              placeholder="bcc@example.com (optional)"
            />
          </div>
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Subject <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: colors.searchBackground,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
            placeholder="Message subject"
          />
        </div>

        {/* Template Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Email Template (Optional)</label>
          <select
            value={form.template || ''}
            onChange={handleTemplateSelect}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: colors.searchBackground,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          >
            <option value="">-- Select a template --</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} {(tpl as any).is_system ? '(System)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
            Apply a pre-designed email template with company branding.
          </p>
        </div>

        {/* Template Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Template (Optional)</label>
          <select
            value={form.template || ''}
            onChange={(e) => handleInputChange('template', e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: colors.searchBackground,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          >
            <option value="">Select a template...</option>
            <option value="welcome">Welcome Email</option>
            <option value="quote">Quote Request</option>
            <option value="followup">Follow-up</option>
            <option value="thank-you">Thank You</option>
            <option value="invoice">Invoice</option>
          </select>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Message <span className="text-red-500">*</span></label>
          <textarea
            required
            value={form.body}
            onChange={(e) => handleInputChange('body', e.target.value)}
            className="flex-1 w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 transition-colors resize-none"
            style={{
              backgroundColor: colors.searchBackground,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontFamily: 'inherit',
            }}
            placeholder="Type your message here..."
          />
        </div>

        {/* Attachments */}
        {form.attachments.length > 0 && (
          <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: colors.searchBackground }}>
            <div className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Attachments ({form.attachments.length})</div>
            <div className="space-y-2">
              {form.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 rounded border transition-colors"
                  style={{ backgroundColor: colors.surface, borderColor: colors.divider }}
                >
                  <div className="flex items-center gap-2">
                    {/* Paperclip icon - SVG */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span className="text-sm truncate max-w-xs" style={{ color: colors.textPrimary }}>
                      {attachment.name}
                    </span>
                    <span className="text-xs" style={{ color: colors.textTertiary }}>({formatFileSize(attachment.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="p-1 rounded transition-colors"
                    style={{ color: colors.textTertiary }}
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.accent}
                    onMouseLeave={(e) => e.currentTarget.style.color = colors.textTertiary}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachment button */}
        <div className="flex items-center gap-4 mb-4">
          <input
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id={`file-upload-${win.id}`}
          />
          <label
            htmlFor={`file-upload-${win.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md border transition-colors cursor-pointer"
            style={{
              borderColor: colors.border,
              color: colors.textSecondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surfaceHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {/* Paperclip icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            Add Attachments
          </label>
          <span className="text-xs" style={{ color: colors.textTertiary }}>
            {form.attachments.length > 0
              ? `${form.attachments.length} file(s) attached`
              : ''}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.divider }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || !form.subject}
            className="px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="submit"
            disabled={sending || !form.to.length || !form.subject}
            className="px-6 py-2 text-sm text-white rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: (sending || !form.to.length || !form.subject) ? colors.textTertiary : colors.primary,
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm rounded-md transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: colors.textSecondary,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .order('name')
        if (!error && data) {
          setTemplates(data)
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err)
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [])

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
          templates={templates}
        />
      ))}
    </React.Fragment>
  )
}
