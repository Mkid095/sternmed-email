/**
 * Settings View Component
 *
 * Professional settings page with proper spacing.
 * Manages user profile and email HTML template designs.
 *
 * @module features/settings/SettingsView
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useTemplateStore, type EmailTemplate } from './useTemplateStore'
import {
  User,
  Key,
  FileText,
  Plus,
  Trash2,
  Edit,
  Eye,
  ChevronRight,
  Mail,
} from 'lucide-react'
import { CloseIcon } from '../../components/icons'

type TabKey = 'profile' | 'templates'

export default function SettingsView() {
  const navigate = useNavigate()
  const { user, emailAliasId, logout } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  const [alias, setAlias] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    bodyHtml: '',
    bodyText: '',
    category: 'general',
  })

  const { templates, fetchTemplates, addTemplate, updateTemplate, deleteTemplate } = useTemplateStore()

  useEffect(() => {
    const fetchAlias = async () => {
      if (!emailAliasId) return

      const { data } = await supabase
        .from('email_aliases')
        .select('*')
        .eq('id', emailAliasId)
        .single()

      setAlias(data)
      setLoading(false)
    }

    fetchAlias()
  }, [emailAliasId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.bodyHtml) {
      alert('Please fill in all required fields (Name, Subject, HTML Body)')
      return
    }

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          name: templateForm.name,
          subject: templateForm.subject,
          bodyHtml: templateForm.bodyHtml,
          bodyText: templateForm.bodyText || templateForm.bodyHtml.replace(/<[^>]*>/g, '').substring(0, 500),
          category: templateForm.category,
        })
      } else {
        await addTemplate({
          name: templateForm.name,
          subject: templateForm.subject,
          bodyHtml: templateForm.bodyHtml,
          bodyText: templateForm.bodyText || templateForm.bodyHtml.replace(/<[^>]*>/g, '').substring(0, 500),
          category: templateForm.category,
        })
      }

      setShowTemplateModal(false)
      setEditingTemplate(null)
      setTemplateForm({ name: '', subject: '', bodyHtml: '', bodyText: '', category: 'general' })
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Failed to save template')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    const result = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template?',
      confirmLabel: 'Delete',
      variant: 'danger',
    })

    if (!result) return

    try {
      await deleteTemplate(id)
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template')
    }
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText || '',
      category: template.category,
    })
    setShowTemplateModal(true)
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="p-8 border-b" style={{ borderColor: colors.divider }}>
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm mb-3"
              style={{ color: colors.textSecondary }}
            >
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
              Back
            </button>
            <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
              Settings
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: colors.divider }}>
        <div className="flex" style={{ paddingLeft: '32px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-6 font-medium text-base transition-colors relative ${
              activeTab === 'profile' ? 'font-semibold' : ''
            }`}
            style={{
              color: activeTab === 'profile' ? colors.primary : colors.textSecondary,
              borderBottom: activeTab === 'profile' ? `2px solid ${colors.primary}` : '2px solid transparent',
            }}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-6 font-medium text-base transition-colors relative ${
              activeTab === 'templates' ? 'font-semibold' : ''
            }`}
            style={{
              color: activeTab === 'templates' ? colors.primary : colors.textSecondary,
              borderBottom: activeTab === 'templates' ? `2px solid ${colors.primary}` : '2px solid transparent',
            }}
          >
            Email Templates
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Profile Section */}
              <section className="rounded-xl p-8" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}>
                <div className="flex items-center gap-4 mb-6">
                  <User size={28} style={{ color: colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>Profile</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                      Email Address
                    </label>
                    <p className="text-base" style={{ color: colors.textPrimary }}>{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                      Role
                    </label>
                    <p className="text-base capitalize" style={{ color: colors.textPrimary }}>{user?.role}</p>
                  </div>
                </div>
              </section>

              {/* Email Alias Section */}
              <section className="rounded-xl p-8" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}>
                <div className="flex items-center gap-4 mb-6">
                  <Mail size={28} style={{ color: colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>Email Alias</h2>
                </div>

                {loading ? (
                  <p style={{ color: colors.textSecondary }}>Loading...</p>
                ) : alias ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                        Alias Email
                      </label>
                      <p className="text-base font-medium" style={{ color: colors.textPrimary }}>{alias.alias_email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                        Display Name
                      </label>
                      <p className="text-base" style={{ color: colors.textPrimary }}>{alias.display_name}</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                        Status
                      </label>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: alias.is_active ? '#10b98120' : '#ef444420',
                          color: alias.is_active ? '#10b981' : '#ef4444',
                        }}
                      >
                        {alias.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: colors.textSecondary }}>No email alias configured</p>
                )}
              </section>

              {/* Actions Section */}
              <section className="rounded-xl p-8" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}>
                <div className="flex items-center gap-4 mb-6">
                  <Key size={28} style={{ color: colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>Actions</h2>
                </div>

                <button
                  onClick={logout}
                  className="w-full md:w-auto px-6 py-3 rounded-lg font-medium transition-colors text-left md:text-center"
                  style={{ color: '#ef4444', backgroundColor: colors.surfaceHover }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.divider)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                >
                  Sign Out
                </button>
              </section>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText size={28} style={{ color: colors.primary }} />
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>Email Templates</h2>
                    <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                      Manage HTML email design templates with branding
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingTemplate(null)
                    setTemplateForm({ name: '', subject: '', bodyHtml: '', bodyText: '', category: 'general' })
                    setShowTemplateModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus size={16} />
                  New Template
                </button>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-xl overflow-hidden flex flex-col"
                    style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
                  >
                    {/* Template Header */}
                    <div className="p-5 border-b" style={{ borderColor: colors.divider }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-base" style={{ color: colors.textPrimary }}>{template.name}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {template.isDefault && (
                            <span
                              className="text-xs px-2 py-1 rounded-full"
                              style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                            >
                              System
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-1 rounded-full capitalize"
                            style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
                          >
                            {template.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm mb-0" style={{ color: colors.textSecondary }}>
                        <span className="font-medium">Subject:</span> {template.subject}
                      </p>
                    </div>

                    {/* Template Preview */}
                    <div className="flex-1 p-5 bg-gray-50">
                      <p className="text-xs mb-2" style={{ color: colors.textTertiary }}>Preview:</p>
                      <div
                        className="rounded border bg-white overflow-hidden"
                        style={{ borderColor: colors.divider, maxHeight: '200px' }}
                        dangerouslySetInnerHTML={{ __html: template.bodyHtml }}
                      />
                    </div>

                    {/* Template Actions */}
                    <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: colors.divider }}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                          style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                          title="Preview full template"
                        >
                          <Eye size={14} />
                          Preview
                        </button>
                        {!template.isDefault && (
                          <>
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                              style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                              title="Edit template"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                              style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                              title="Delete template"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="col-span-1 md:col-span-2">
                    <div
                      className="rounded-xl p-16 text-center"
                      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
                    >
                      <Mail size={80} className="mx-auto mb-6 opacity-30" style={{ color: colors.textSecondary }} />
                      <h3 className="text-lg font-medium mb-3" style={{ color: colors.textPrimary }}>
                        No email templates yet
                      </h3>
                      <p className="mb-6 max-w-md mx-auto" style={{ color: colors.textSecondary }}>
                        Create HTML email design templates with your branding.
                        These templates wrap outgoing emails with professional headers and footers.
                      </p>
                      <button
                        onClick={() => setShowTemplateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white transition-all"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Plus size={16} />
                        Create Your First Template
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Edit Modal */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setShowTemplateModal(false)}
        >
          <div
            className="rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
          >
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: colors.divider }}>
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                {editingTemplate ? 'Edit Email Template' : 'New Email Template'}
              </h2>
              <button
                onClick={() => {
                  setShowTemplateModal(false)
                  setEditingTemplate(null)
                  setTemplateForm({ name: '', subject: '', bodyHtml: '', bodyText: '', category: 'general' })
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Standard Branded Email"
                    className="w-full px-4 py-2.5 rounded-lg outline-none"
                    style={{
                      backgroundColor: colors.searchBackground,
                      color: colors.textPrimary,
                      border: `1px solid ${colors.border}`,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg outline-none"
                    style={{
                      backgroundColor: colors.searchBackground,
                      color: colors.textPrimary,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <option value="general">General</option>
                    <option value="marketing">Marketing</option>
                    <option value="transactional">Transactional</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                  Default Subject Line *
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g., Your Order Confirmation - Sternmed Afrika"
                  className="w-full px-4 py-2.5 rounded-lg outline-none"
                  style={{
                    backgroundColor: colors.searchBackground,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                  }}
                />
                <p className="text-xs mt-2" style={{ color: colors.textTertiary }}>
                  This subject will be used as the default for emails sent with this template.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                  HTML Body Content *
                </label>
                <p className="text-xs mb-3" style={{ color: colors.textTertiary }}>
                  Enter full HTML email template. Include a wrapper div with your branding.
                </p>
                <textarea
                  value={templateForm.bodyHtml}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml: e.target.value })}
                  placeholder={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <!-- Your header with branding -->
  <div style="background: #1a5f7a; color: white; padding: 30px; text-align: center;">
    <h1>Sternmed Afrika</h1>
    <p>Medical Equipment Solutions</p>
  </div>

  <!-- Email content will be inserted here -->
  <div style="padding: 30px;">
    {{content}}
  </div>

  <!-- Footer -->
  <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p>&copy; {{current_date}} Sternmed Afrika Limited</p>
  </div>
</div>`}
                  rows={20}
                  className="w-full px-4 py-3 rounded-lg outline-none font-mono text-sm"
                  style={{
                    backgroundColor: colors.searchBackground,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-4" style={{ borderColor: colors.divider }}>
              <button
                onClick={() => {
                  setShowTemplateModal(false)
                  setEditingTemplate(null)
                  setTemplateForm({ name: '', subject: '', bodyHtml: '', bodyText: '', category: 'general' })
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: colors.primary }}
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setPreviewTemplate(null)}
        >
          <div
            className="rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
          >
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: colors.divider }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>{previewTemplate.name}</h2>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Subject: {previewTemplate.subject}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div
                className="mx-auto bg-white"
                style={{ maxWidth: '650px' }}
                dangerouslySetInnerHTML={{ __html: previewTemplate.bodyHtml }}
              />
            </div>

            <div className="p-6 border-t flex justify-end" style={{ borderColor: colors.divider }}>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: colors.primary }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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
    </div>
  )
}
