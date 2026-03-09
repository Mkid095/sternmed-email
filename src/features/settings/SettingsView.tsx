import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import {
  User,
  Lock,
  Key,
  FileText,
  Plus,
  Trash2,
  Edit,
  Eye,
  Mail,
  ChevronRight,
} from 'lucide-react'

const COMPANY_LOGO = 'https://res.cloudinary.com/dxb22swfg/image/upload/v1765747561/Asset_4_v5ksi6.png'
const COMPANY_NAME = 'Sternmed Afrika'
const COMPANY_EMAIL = 'info@sternmed.afrika'
const COMPANY_PHONE = '+254 700 000 000'
const COMPANY_WEBSITE = 'www.sternmed.afrika'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  category: string
  is_system: boolean
}

type TabKey = 'profile' | 'templates'

export default function SettingsView() {
  const navigate = useNavigate()
  const { user, emailAliasId, logout } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  const [alias, setAlias] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'general'
  })

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
  }, [])

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name')

    if (!error && data) {
      setTemplates(data as EmailTemplate[])
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      alert('Please fill in all fields')
      return
    }

    const bodyWithBranding = templateForm.body
      .replace(/\{\{logo\}\}/g, COMPANY_LOGO)
      .replace(/\{\{company_name\}\}/g, COMPANY_NAME)
      .replace(/\{\{company_email\}\}/g, COMPANY_EMAIL)
      .replace(/\{\{company_phone\}\}/g, COMPANY_PHONE)
      .replace(/\{\{company_website\}\}/g, COMPANY_WEBSITE)

    const htmlBody = convertToHtml(bodyWithBranding)

    if (editingTemplate) {
      await supabase
        .from('email_templates')
        .update({
          name: templateForm.name,
          subject: templateForm.subject,
          body_html: htmlBody,
          category: templateForm.category,
        })
        .eq('id', editingTemplate.id)
    } else {
      await supabase
        .from('email_templates')
        .insert({
          name: templateForm.name,
          subject: templateForm.subject,
          body_html: htmlBody,
          body_text: templateForm.body,
          category: templateForm.category,
          is_system: false,
        })
    }

    setShowTemplateModal(false)
    setEditingTemplate(null)
    setTemplateForm({ name: '', subject: '', body: '', category: 'general' })
    fetchTemplates()
  }

  const handleDeleteTemplate = async (id: string) => {
    const result = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template?',
      confirmLabel: 'Delete',
      variant: 'danger',
    })

    if (!result) return

    await supabase.from('email_templates').delete().eq('id', id)
    fetchTemplates()
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body_html,
      category: template.category,
    })
    setShowTemplateModal(true)
  }

  const convertToHtml = (text: string): string => {
    const lines = text.split('\n')
    let html = ''
    let inList = false

    for (const line of lines) {
      if (line.startsWith('• ') || line.startsWith('- ')) {
        if (!inList) {
          html += '<ul>'
          inList = true
        }
        html += `<li>${line.substring(2)}</li>`
      } else {
        if (inList) {
          html += '</ul>'
          inList = false
        }
        if (line.trim()) {
          html += `<p>${line}</p>`
        }
      }
    }

    if (inList) html += '</ul>'
    return html
  }

  const insertVariable = (variable: string) => {
    setTemplateForm({
      ...templateForm,
      body: templateForm.body + `{{${variable}}}`
    })
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm mb-2"
              style={{ color: colors.textSecondary }}
            >
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
              Back
            </button>
            <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              Settings
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: colors.divider }}>
        <div className="flex" style={{ marginLeft: '24px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'border-b-2'
                : 'border-b-0'
            }`}
            style={{
              borderBottomColor: colors.primary,
              color: activeTab === 'profile' ? colors.primary : colors.textSecondary,
            }}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'templates'
                ? 'border-b-2'
                : 'border-b-0'
            }`}
            style={{
              borderBottomColor: colors.primary,
              color: activeTab === 'templates' ? colors.primary : colors.textSecondary,
            }}
          >
            Email Templates
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div className="rounded-lg p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}>
                <div className="flex items-center gap-3 mb-6">
                  <User size={24} style={{ color: colors.textSecondary }} />
                  <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Profile</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                      Email
                    </label>
                    <p style={{ color: colors.textPrimary }}>{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                      Role
                    </label>
                    <p className="capitalize" style={{ color: colors.textPrimary }}>{user?.role}</p>
                  </div>
                </div>
              </div>

              {/* Email Alias Section */}
              <div className="rounded-lg p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}>
                <div className="flex items-center gap-3 mb-6">
                  <Key size={24} style={{ color: colors.textSecondary }} />
                  <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Email Alias</h2>
                </div>

                {loading ? (
                  <p style={{ color: colors.textSecondary }}>Loading...</p>
                ) : alias ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                        Email Address
                      </label>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>{alias.alias_email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                        Display Name
                      </label>
                      <p style={{ color: colors.textPrimary }}>{alias.display_name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
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
              </div>

              {/* Actions */}
              <div className="rounded-lg p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}>
                <div className="flex items-center gap-3 mb-6">
                  <Lock size={24} style={{ color: colors.textSecondary }} />
                  <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Actions</h2>
                </div>

                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors"
                  style={{ color: '#ef4444' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} style={{ color: colors.textSecondary }} />
                  <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Email Templates</h2>
                </div>
                <button
                  onClick={() => {
                    setEditingTemplate(null)
                    setTemplateForm({ name: '', subject: '', body: '', category: 'general' })
                    setShowTemplateModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus size={16} />
                  New Template
                </button>
              </div>

              {/* Templates List */}
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-lg p-6"
                    style={{
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.divider}`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold" style={{ color: colors.textPrimary }}>{template.name}</h3>
                          {template.is_system && (
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                            >
                              System
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded capitalize"
                            style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
                          >
                            {template.category}
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                          Subject: {template.subject}
                        </p>
                        <p className="text-xs truncate" style={{ color: colors.textTertiary }}>
                          {template.body_html.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          style={{ color: colors.textSecondary }}
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                        {!template.is_system && (
                          <>
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                              style={{ color: colors.primary }}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                              style={{ color: '#ef4444' }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div
                    className="rounded-lg p-12 text-center"
                    style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
                  >
                    <Mail size={64} className="mx-auto mb-4 opacity-30" style={{ color: colors.textSecondary }} />
                    <p className="mb-4" style={{ color: colors.textSecondary }}>No email templates yet</p>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="font-medium hover:underline"
                      style={{ color: colors.primary }}
                    >
                      Create your first template →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setShowTemplateModal(false)}
        >
          <div
            className="rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
          >
            <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                {editingTemplate ? 'Edit Template' : 'New Email Template'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Welcome Email"
                    className="w-full px-4 py-2 rounded-lg outline-none"
                    style={{
                      backgroundColor: colors.searchBackground,
                      color: colors.textPrimary,
                      border: `1px solid ${colors.border}`,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg outline-none"
                    style={{
                      backgroundColor: colors.searchBackground,
                      color: colors.textPrimary,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <option value="general">General</option>
                    <option value="welcome">Welcome</option>
                    <option value="quote">Quote</option>
                    <option value="invoice">Invoice</option>
                    <option value="follow-up">Follow-up</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Welcome to {{company_name}}"
                  className="w-full px-4 py-2 rounded-lg outline-none"
                  style={{
                    backgroundColor: colors.searchBackground,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                  Body Content
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="text-xs" style={{ color: colors.textTertiary }}>Quick variables:</span>
                  <button
                    type="button"
                    onClick={() => insertVariable('name')}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                  >
                    + Name
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable('email')}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                  >
                    + Email
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable('company_name')}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
                  >
                    + Company
                  </button>
                </div>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder={`Dear {{name}},

Welcome to {{company_name}}! We're excited to have you on board.

• Feature 1
• Feature 2
• Feature 3

Best regards,
The {{company_name}} Team`}
                  rows={12}
                  className="w-full px-4 py-2 rounded-lg outline-none font-mono text-sm"
                  style={{
                    backgroundColor: colors.searchBackground,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                  }}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: colors.divider }}>
              <button
                onClick={() => {
                  setShowTemplateModal(false)
                  setEditingTemplate(null)
                  setTemplateForm({ name: '', subject: '', body: '', category: 'general' })
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.searchBackground, color: colors.textSecondary }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: colors.primary }}
              >
                {editingTemplate ? 'Update' : 'Create'} Template
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
            className="rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.divider}` }}
          >
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: colors.divider }}>
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>Template Preview</h2>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                style={{ color: colors.textSecondary }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 pb-6 border-b" style={{ borderColor: colors.divider }}>
                <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>Subject:</p>
                <p className="font-medium" style={{ color: colors.textPrimary }}>{previewTemplate.subject}</p>
              </div>

              <div className="rounded-lg p-6 border" style={{ borderColor: colors.divider }}>
                <div
                  className="prose max-w-none"
                  style={{ color: colors.textPrimary }}
                  dangerouslySetInnerHTML={{ __html: previewTemplate.body_html }}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end" style={{ borderColor: colors.divider }}>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
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
