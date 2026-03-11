/**
 * ============================================================================
 * COMPOSE WINDOW MANAGER
 * ============================================================================
 * 
 * Manages multiple floating compose windows with drag & drop support.
 * 
 * Features:
 * - Multiple floating windows
 * - Drag to reposition
 * - Minimize to dock
 * - Z-index stacking
 * - Full dark mode support
 * 
 * @module features/compose/ComposeWindowManager
 * @version 2.1.0
 * ============================================================================
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { X, Minus, Maximize2, GripVertical, FileText, User } from 'lucide-react'
import { useComposeForm } from './useComposeForm'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useToastSuccess, useToastError } from '../shared/ui'
import { useComposeStore } from './useComposeStore'
import { useTheme } from '../../contexts/ThemeContext'
import { useTemplateStore } from '../settings/useTemplateStore'
import type { ComposeWindow } from './useComposeStore'
import type { EmailTemplate } from '../settings/useTemplateStore'

// ============================================================================
// TYPES
// ============================================================================

interface ComposeWindowProps {
  win: ComposeWindow
  onClose: () => void
  onMinimize: () => void
  onRestore: () => void
  onActivate: () => void
  templates: EmailTemplate[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WINDOW_DEFAULTS = {
  WIDTH: 580,
  HEIGHT: 500,
} as const

const COMPANY_INFO = {
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

// ============================================================================
// COMPOSE WINDOW COMPONENT
// ============================================================================

function ComposeWindow({ 
  win, 
  onClose, 
  onMinimize, 
  onRestore, 
  onActivate, 
  templates 
}: ComposeWindowProps) {
  const {
    form,
    sending,
    savingDraft,
    handleInputChange,
    handleTemplateChange,
    handleFileSelect,
    removeAttachment,
    sendEmail,
    saveAsDraft,
    resetForm,
    formatFileSize
  } = useComposeForm({ initialValues: win.initialData })

  const showSuccess = useToastSuccess()
  const showError = useToastError()
  const emailAliasId = useAuthStore((state) => state.emailAliasId)
  const { colors } = useTheme()
  const updateWindowPosition = useComposeStore((state) => state.updateWindowPosition)

  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await sendEmail()
    if (success) {
      onClose()
    }
  }

  const handleSaveDraft = async () => {
    if (win.draftId) {
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
        window.dispatchEvent(new Event('email-deleted'))
      } catch (error) {
        console.error('Failed to update draft:', error)
        showError('Failed to save draft')
      }
    } else {
      const success = await saveAsDraft()
      if (success) {
        onClose()
        window.dispatchEvent(new Event('email-deleted'))
      }
    }
  }

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return
    e.preventDefault()
    setIsDragging(true)
    onActivate()
    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - WINDOW_DEFAULTS.WIDTH))
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100))
    updateWindowPosition(win.id, newX, newY)
  }, [isDragging, dragOffset, win.id, updateWindowPosition])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Minimized state
  if (win.minimized) {
    const minimizedWindows = useComposeStore.getState().windows.filter(w => w.minimized)
    const index = minimizedWindows.findIndex(w => w.id === win.id)
    const stackOffset = index * 48

    return (
      <div
        className="fixed right-4 w-64 rounded-lg shadow-lg cursor-pointer overflow-hidden border transition-all duration-200"
        style={{
          zIndex: win.zIndex,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          bottom: `${16 + stackOffset}px`,
        }}
        onClick={() => {
          onRestore()
          onActivate()
        }}
      >
        <div className="p-3 flex items-center gap-3">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: colors.primary }}
          />
          <span 
            className="flex-1 text-sm font-medium truncate"
            style={{ color: colors.textPrimary }}
          >
            {form.subject || 'New Message'}
          </span>
          <span 
            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ 
              backgroundColor: colors.primary + '20', 
              color: colors.primary 
            }}
          >
            Draft
          </span>
          <Maximize2 size={14} style={{ color: colors.textSecondary }} />
        </div>
      </div>
    )
  }

  // Full window
  return (
    <div
      ref={windowRef}
      className="fixed flex flex-col rounded-xl shadow-2xl overflow-hidden border"
      style={{
        left: win.position.x,
        top: win.position.y,
        width: WINDOW_DEFAULTS.WIDTH,
        height: WINDOW_DEFAULTS.HEIGHT,
        zIndex: win.zIndex,
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
      onClick={onActivate}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-move border-b"
        style={{ borderColor: colors.divider }}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripVertical size={14} style={{ color: colors.textTertiary }} />
          <span 
            className="font-medium text-sm truncate"
            style={{ color: colors.textPrimary }}
          >
            {form.subject || 'New Message'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMinimize() }}
            className="p-1.5 rounded transition-colors"
            style={{ color: colors.textSecondary }}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="p-1.5 rounded transition-colors hover:text-red-500"
            style={{ color: colors.textSecondary }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        {/* Recipients */}
        <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: colors.divider }}>
          <div className="flex items-center gap-3">
            <label className="text-sm w-10 flex-shrink-0" style={{ color: colors.textSecondary }}>To</label>
            <input
              type="text"
              required
              value={form.to.join(', ')}
              onChange={(e) => handleInputChange('to', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
              style={{ backgroundColor: colors.surfaceHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
              placeholder="recipient@email.com"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1 flex items-center gap-3">
              <label className="text-sm w-10 flex-shrink-0" style={{ color: colors.textSecondary }}>CC</label>
              <input
                type="text"
                value={form.cc.join(', ')}
                onChange={(e) => handleInputChange('cc', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                style={{ backgroundColor: colors.surfaceHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                placeholder="cc@email.com"
              />
            </div>
            <div className="flex-1 flex items-center gap-3">
              <label className="text-sm w-10 flex-shrink-0" style={{ color: colors.textSecondary }}>BCC</label>
              <input
                type="text"
                value={form.bcc.join(', ')}
                onChange={(e) => handleInputChange('bcc', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                style={{ backgroundColor: colors.surfaceHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                placeholder="bcc@email.com"
              />
            </div>
          </div>
        </div>

        {/* Subject & Template */}
        <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: colors.divider }}>
          <div className="flex items-center gap-3">
            <label className="text-sm w-20 flex-shrink-0" style={{ color: colors.textSecondary }}>Subject</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
              style={{ backgroundColor: colors.surfaceHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
              placeholder="Email subject"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm w-20 flex-shrink-0" style={{ color: colors.textSecondary }}>Template</label>
            <select
              value={form.template || ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded text-sm outline-none cursor-pointer"
              style={{ backgroundColor: colors.surfaceHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
            >
              <option value="">Select template (optional)</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.isDefault ? '(System)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-4 py-3 overflow-hidden">
          <textarea
            required
            value={form.body}
            onChange={(e) => handleInputChange('body', e.target.value)}
            className="w-full h-full px-3 py-2 rounded text-sm resize-none outline-none leading-relaxed"
            style={{ backgroundColor: colors.surfaceHover, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
            placeholder="Write your message here..."
          />
        </div>

        {/* Attachments */}
        {form.attachments.length > 0 && (
          <div className="px-4 py-2 border-t" style={{ borderColor: colors.divider }}>
            <div className="flex flex-wrap gap-2">
              {form.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: colors.surfaceHover, border: `1px solid ${colors.border}` }}
                >
                  <FileText size={12} style={{ color: colors.primary }} />
                  <span className="truncate max-w-[100px]" style={{ color: colors.textPrimary }}>
                    {attachment.name}
                  </span>
                  <span className="text-xs" style={{ color: colors.textTertiary }}>
                    ({formatFileSize(attachment.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="hover:opacity-70"
                    style={{ color: colors.textSecondary }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: colors.divider }}>
          <div className="flex items-center gap-3">
            <input
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id={`file-upload-${win.id}`}
            />
            <label
              htmlFor={`file-upload-${win.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded cursor-pointer"
              style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
            >
              <FileText size={14} />
              Attach
            </label>
            {savingDraft && <span className="text-xs" style={{ color: colors.textTertiary }}>Saving...</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || !form.subject}
              className="px-3 py-1.5 text-sm rounded disabled:opacity-50"
              style={{ color: colors.textSecondary }}
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={sending || !form.to.length || !form.subject}
              className="px-4 py-1.5 text-sm text-white rounded font-medium disabled:opacity-50"
              style={{ backgroundColor: colors.primary }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ============================================================================
// MANAGER COMPONENT
// ============================================================================

export function ComposeWindowManager() {
  const { windows, closeCompose, minimizeCompose, restoreCompose, bringToFront } = useComposeStore()
  const { templates } = useTemplateStore()

  const sortedWindows = useMemo(
    () => [...windows].sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  )

  return (
    <>
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
    </>
  )
}
