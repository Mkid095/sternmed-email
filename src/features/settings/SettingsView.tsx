import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'
import { User, Lock, Key, FileText, Plus, Trash2, Edit, Eye, Mail } from 'lucide-react'

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
  const { user, emailAliasId, logout } = useAuthStore()
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

    // Replace company placeholders
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
    if (!confirm('Are you sure you want to delete this template?')) return

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
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
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900">{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <p className="text-gray-900 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>

              {/* Email Alias Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Key className="w-6 h-6 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Email Alias</h2>
                </div>

                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : alias ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <p className="text-gray-900 font-medium">{alias.alias_email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name
                      </label>
                      <p className="text-gray-900">{alias.display_name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alias.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {alias.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No email alias configured</p>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-6 h-6 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
                </div>

                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                  <FileText className="w-6 h-6 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
                </div>
                <button
                  onClick={() => {
                    setEditingTemplate(null)
                    setTemplateForm({ name: '', subject: '', body: '', category: 'general' })
                    setShowTemplateModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Template
                </button>
              </div>

              {/* Templates List */}
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          {template.is_system && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              System
                            </span>
                          )}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
                            {template.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Subject: {template.subject}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {template.body_html.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!template.is_system && (
                          <>
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No email templates yet</p>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Email Template'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Welcome Email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Welcome to {{company_name}}"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Content
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500">Quick variables:</span>
                  <button
                    onClick={() => insertVariable('name')}
                    className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    + Name
                  </button>
                  <button
                    onClick={() => insertVariable('email')}
                    className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    + Email
                  </button>
                  <button
                    onClick={() => insertVariable('company_name')}
                    className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    + Company
                  </button>
                </div>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Dear {{name}},

Welcome to {{company_name}}! We're excited to have you on board.

• Feature 1
• Feature 2
• Feature 3

Best regards,
The {{company_name}} Team"
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTemplateModal(false)
                  setEditingTemplate(null)
                  setTemplateForm({ name: '', subject: '', body: '', category: 'general' })
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingTemplate ? 'Update' : 'Create'} Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Template Preview</h2>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Subject:</p>
                <p className="font-medium">{previewTemplate.subject}</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <div dangerouslySetInnerHTML={{ __html: previewTemplate.body_html }} />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
