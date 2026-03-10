/**
 * ============================================================================
 * COMPOSE WINDOW MANAGER
 * ============================================================================
 * 
 * This module manages multiple floating compose windows in the email application.
 * It provides a Gmail-like experience where users can:
 * - Open multiple compose windows simultaneously
 * - Drag windows to reposition them
 * - Minimize windows to a dock at the bottom
 * - Restore minimized windows
 * - Manage z-index stacking (bring windows to front on click)
 * 
 * Architecture:
 * - ComposeWindowManager: Parent component that renders all active windows
 * - ComposeWindow: Individual floating window component
 * - useComposeStore: Zustand store for window state management
 * - useComposeForm: Custom hook for form handling
 * 
 * @module features/compose/ComposeWindowManager
 * @author Sternmed Email Team
 * @version 2.0.0
 * ============================================================================
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { 
  X,           // Close button icon
  Minus,       // Minimize button icon
  Maximize2,   // Restore/expand icon
  GripVertical // Drag handle icon
} from 'lucide-react'
import { useComposeForm } from './useComposeForm'
import { useAuthStore } from '../../store/authStore'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useToastSuccess, useToastError } from '../shared/ui'
import { useComposeStore } from './useComposeStore'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../config/supabase'
import type { ComposeWindow } from './useComposeStore'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Email template structure from the database
 */
interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text?: string
  is_system: boolean
}

/**
 * Props passed to each individual compose window
 */
interface ComposeWindowProps {
  win: ComposeWindow           // Window state from store
  onClose: () => void          // Callback to close the window
  onMinimize: () => void       // Callback to minimize the window
  onRestore: () => void        // Callback to restore from minimized state
  onActivate: () => void       // Callback to bring window to front
  templates: EmailTemplate[]   // Available email templates
}

/**
 * Company information used for template placeholders
 * TODO: Move to user settings/configuration
 */
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
// CONSTANTS
// ============================================================================

/** Default dimensions for compose window */
const WINDOW_DEFAULTS = {
  WIDTH: 600,
  HEIGHT: 520,
  MIN_WIDTH: 400,
  MIN_HEIGHT: 400,
} as const

/** Z-index range for window stacking */
const Z_INDEX = {
  MIN: 100,
  MAX: 999,
} as const

// ============================================================================
// COMPOSE WINDOW COMPONENT
// ============================================================================

/**
 * Individual Compose Window Component
 * 
 * Renders a floating, draggable window with an email compose form.
 * Supports minimize/restore functionality and drag-to-reposition.
 * 
 * Features:
 * - Draggable header for repositioning
 * - Minimize to compact bar
 * - Form validation before send
 * - Template selection with placeholder replacement
 * - File attachments
 * - Draft auto-save
 * 
 * @param props - Window props including state and callbacks
 */
function ComposeWindow({ 
  win, 
  onClose, 
  onMinimize, 
  onRestore, 
  onActivate, 
  templates 
}: ComposeWindowProps) {
  // ========================================================================
  // HOOKS & STATE
  // ========================================================================
  
  /** Form handling hook with all email state and operations */
  const { 
    form, 
    sending, 
    savingDraft, 
    handleInputChange, 
    handleFileSelect, 
    removeAttachment, 
    sendEmail, 
    saveAsDraft, 
    resetForm, 
    formatFileSize 
  } = useComposeForm({ initialValues: win.initialData })

  /** Toast notifications */
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  /** Auth and theme */
  const emailAliasId = useAuthStore((state) => state.emailAliasId)
  const { colors } = useTheme()
  
  /** Store actions */
  const updateWindowPosition = useComposeStore((state) => state.updateWindowPosition)

  /** Drag state */
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  // ========================================================================
  // TEMPLATE HANDLING
  // ========================================================================

  /**
   * Handles template selection from dropdown
   * Replaces placeholders with actual values (company info, customer name, etc.)
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
    Object.entries(COMPANY_INFO).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      bodyText = bodyText.replace(new RegExp(placeholder, 'g'), value)
    })

    // Replace customer variables if recipient exists
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

  // ========================================================================
  // FORM SUBMISSION HANDLERS
  // ========================================================================

  /**
   * Handle form submission (Send Email)
   * Validates and sends the email, closes window on success
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
   * Updates existing draft or creates new one
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
   * Handle cancel - close without saving
   */
  const handleCancel = () => {
    resetForm()
    onClose()
  }

  // ========================================================================
  // DRAG & DROP HANDLING
  // ========================================================================

  /**
   * Start dragging - record initial mouse position offset
   */
  const handleDragStart = (e: React.MouseEvent) => {
    // Ignore if clicking on buttons or inputs
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return
    
    e.preventDefault()
    setIsDragging(true)
    onActivate()
    
    // Calculate offset from window's top-left corner
    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  /**
   * Handle mouse move during drag
   * Updates window position in real-time
   */
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    // Calculate new position keeping window within viewport
    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - WINDOW_DEFAULTS.WIDTH))
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100))
    
    updateWindowPosition(win.id, newX, newY)
  }, [isDragging, dragOffset, win.id, updateWindowPosition])

  /**
   * End dragging
   */
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Setup/cleanup drag event listeners
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

  // ========================================================================
  // MINIMIZED STATE RENDER
  // ========================================================================

  /**
   * Render minimized window as a compact bar
   * Clicking restores the window
   */
  if (win.minimized) {
    // Calculate stacking offset for multiple minimized windows
    const minimizedWindows = useComposeStore.getState().windows.filter(w => w.minimized)
    const index = minimizedWindows.findIndex(w => w.id === win.id)
    const stackOffset = index * 48 // Each bar is ~48px tall with spacing

    return (
      <div
        className="fixed right-4 w-72 rounded-xl shadow-lg cursor-pointer overflow-hidden border transition-all duration-300 hover:shadow-xl"
        style={{
          zIndex: win.zIndex,
          backgroundColor: colors.surface,
          borderColor: colors.primary + '40',
          bottom: `${16 + stackOffset}px`,
        }}
        onClick={() => {
          onRestore()
          onActivate()
        }}
        role="button"
        aria-label="Restore compose window"
      >
        {/* Minimized bar content */}
        <div 
          className="p-3 flex items-center gap-3"
          style={{ 
            background: `linear-gradient(135deg, ${colors.primary}15, transparent)` 
          }}
        >
          {/* Status indicator */}
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: colors.primary }}
          />
          
          {/* Subject */}
          <span 
            className="flex-1 text-sm font-medium truncate"
            style={{ color: colors.textPrimary }}
          >
            {form.subject || 'New Message'}
          </span>
          
          {/* Draft badge */}
          <span 
            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ 
              backgroundColor: colors.primary + '20', 
              color: colors.primary 
            }}
          >
            Draft
          </span>
          
          {/* Restore icon */}
          <Maximize2 
            size={14} 
            style={{ color: colors.textSecondary }}
            className="flex-shrink-0"
          />
        </div>
      </div>
    )
  }

  // ========================================================================
  // FULL WINDOW RENDER
  // ========================================================================

  return (
    <div
      ref={windowRef}
      className="fixed flex flex-col rounded-2xl shadow-2xl overflow-hidden border transition-shadow duration-200"
      style={{
        left: win.position.x,
        top: win.position.y,
        width: WINDOW_DEFAULTS.WIDTH,
        height: WINDOW_DEFAULTS.HEIGHT,
        zIndex: win.zIndex,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        boxShadow: isDragging 
          ? `0 25px 50px -12px rgba(0, 0, 0, 0.25)` 
          : undefined,
      }}
      onClick={onActivate}
      role="dialog"
      aria-modal="true"
      aria-label="Compose email"
    >
      {/* ================================================================
          DRAGGABLE HEADER
          ================================================================ */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-move select-none"
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary}10, ${colors.primary}05)`,
          borderBottom: `1px solid ${colors.divider}` 
        }}
        onMouseDown={handleDragStart}
      >
        {/* Left: Drag handle + Title */}
        <div className="flex items-center gap-2">
          <GripVertical 
            size={16} 
            style={{ color: colors.textTertiary }}
            className="flex-shrink-0"
          />
          <span 
            className="font-semibold truncate text-sm"
            style={{ color: colors.textPrimary }}
          >
            {form.subject || 'New Message'}
          </span>
        </div>

        {/* Right: Window controls */}
        <div className="flex items-center gap-1">
          {/* Minimize button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMinimize()
            }}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{ color: colors.textSecondary }}
            title="Minimize"
            aria-label="Minimize window"
          >
            <Minus size={16} />
          </button>
          
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="p-2 rounded-lg transition-all hover:scale-110 hover:text-red-500"
            style={{ color: colors.textSecondary }}
            title="Close"
            aria-label="Close window"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ================================================================
          FORM CONTENT
          ================================================================ */}
      <form 
        onSubmit={handleSubmit} 
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.surface }}
      >
        {/* Recipients Section */}
        <div className="px-4 py-3 space-y-3 border-b" style={{ borderColor: colors.divider }}>
          {/* To Field */}
          <div className="flex items-center gap-3">
            <label 
              className="text-sm font-medium w-12 flex-shrink-0"
              style={{ color: colors.textSecondary }}
            >
              To <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.to.join(', ')}
              onChange={(e) => handleInputChange('to', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2"
              style={{
                backgroundColor: colors.surfaceHover,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
              placeholder="recipient@example.com"
            />
          </div>

          {/* CC & BCC Row */}
          <div className="flex gap-4">
            {/* CC Field */}
            <div className="flex-1 flex items-center gap-3">
              <label 
                className="text-sm font-medium w-12 flex-shrink-0"
                style={{ color: colors.textSecondary }}
              >
                CC
              </label>
              <input
                type="text"
                value={form.cc.join(', ')}
                onChange={(e) => handleInputChange('cc', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all"
                style={{
                  backgroundColor: colors.surfaceHover,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
                placeholder="cc@example.com"
              />
            </div>
            
            {/* BCC Field */}
            <div className="flex-1 flex items-center gap-3">
              <label 
                className="text-sm font-medium w-12 flex-shrink-0"
                style={{ color: colors.textSecondary }}
              >
                BCC
              </label>
              <input
                type="text"
                value={form.bcc.join(', ')}
                onChange={(e) => handleInputChange('bcc', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all"
                style={{
                  backgroundColor: colors.surfaceHover,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
                placeholder="bcc@example.com"
              />
            </div>
          </div>
        </div>

        {/* Subject & Template Section */}
        <div className="px-4 py-3 space-y-3 border-b" style={{ borderColor: colors.divider }}>
          {/* Subject Field */}
          <div className="flex items-center gap-3">
            <label 
              className="text-sm font-medium w-24 flex-shrink-0"
              style={{ color: colors.textSecondary }}
            >
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={{
                backgroundColor: colors.surfaceHover,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
              placeholder="Email subject"
            />
          </div>

          {/* Template Selector */}
          <div className="flex items-center gap-3">
            <label 
              className="text-sm font-medium w-24 flex-shrink-0"
              style={{ color: colors.textSecondary }}
            >
              Template
            </label>
            <select
              value={form.template || ''}
              onChange={handleTemplateSelect}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all cursor-pointer"
              style={{
                backgroundColor: colors.surfaceHover,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
            >
              <option value="">Select a template (optional)</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.is_system ? '(System)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message Body */}
        <div className="flex-1 px-4 py-3 overflow-hidden">
          <textarea
            required
            value={form.body}
            onChange={(e) => handleInputChange('body', e.target.value)}
            className="w-full h-full px-3 py-2 rounded-lg text-sm outline-none resize-none leading-relaxed"
            style={{
              backgroundColor: colors.surfaceHover,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
            placeholder="Write your message here..."
          />
        </div>

        {/* Attachments Section */}
        {form.attachments.length > 0 && (
          <div 
            className="px-4 py-3 border-t"
            style={{ borderColor: colors.divider }}
          >
            <div 
              className="text-xs font-medium mb-2 uppercase tracking-wide"
              style={{ color: colors.textTertiary }}
            >
              Attachments ({form.attachments.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {form.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm group"
                  style={{ 
                    backgroundColor: colors.surfaceHover,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <span className="truncate max-w-[120px]" style={{ color: colors.textPrimary }}>
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
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ 
            borderColor: colors.divider,
            backgroundColor: colors.background
          }}
        >
          {/* Left: Attachment button */}
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
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border cursor-pointer transition-all hover:bg-opacity-80"
              style={{
                borderColor: colors.border,
                color: colors.textSecondary,
                backgroundColor: colors.surfaceHover,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Attach
            </label>
            
            {/* Status text */}
            {savingDraft && (
              <span className="text-xs" style={{ color: colors.textTertiary }}>
                Saving...
              </span>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || !form.subject}
              className="px-4 py-2 text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.surfaceHover,
                color: colors.textSecondary,
              }}
            >
              Save Draft
            </button>
            
            <button
              type="submit"
              disabled={sending || !form.to.length || !form.subject}
              className="px-5 py-2 text-sm text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
              style={{
                backgroundColor: (sending || !form.to.length || !form.subject) 
                  ? colors.textTertiary 
                  : colors.primary,
              }}
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
// COMPOSE WINDOW MANAGER COMPONENT
// ============================================================================

/**
 * ComposeWindowManager Component
 * 
 * Parent component that manages all active compose windows.
 * Handles:
 * - Rendering windows sorted by z-index
 * - Fetching email templates
 * - Coordinating window state with the store
 * 
 * Usage:
 * ```tsx
 * <ComposeWindowManager />
 * ```
 */
export function ComposeWindowManager() {
  // ========================================================================
  // STATE & HOOKS
  // ========================================================================
  
  /** Window state from Zustand store */
  const { 
    windows, 
    closeCompose, 
    minimizeCompose, 
    restoreCompose, 
    bringToFront 
  } = useComposeStore()

  /** Email templates from database */
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // ========================================================================
  // EFFECTS
  // ========================================================================

  /**
   * Fetch email templates on mount
   */
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

  // ========================================================================
  // RENDER
  // ========================================================================

  /**
   * Sort windows by z-index so higher ones render last (on top)
   */
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
