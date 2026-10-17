/**
 * Settings
 *
 * Two tabs: the account profile, and email templates. Template previews
 * render in a sandboxed iframe via <TemplatePreview>, because email HTML
 * carries its own styles and cannot be judged by injecting it into this DOM.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  KeyRound,
  LogOut,
  FileText,
  Plus,
  Trash2,
  Pencil,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import { useToastSuccess, useToastError, useToastInfo } from '../shared/ui'
import { Button, IconButton } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { TemplatePreview } from '../../components/templates/TemplatePreview'
import { COMPANY, hasBrandPlaceholder } from '../../config/brand'
import {
  useTemplateStore,
  hasLegacyPlaceholder,
  type EmailTemplate,
} from './useTemplateStore'
import { changePassword } from '../../config/firebase'

type Tab = 'profile' | 'templates'

const PREVIEW_VARS: Record<string, string> = {
  '{{company_name}}': COMPANY.brandName,
  '{{company_address}}': COMPANY.addressLine1,
  '{{company_phone}}': COMPANY.phone,
  '{{company_email}}': COMPANY.supportEmail,
  '{{website}}': COMPANY.website,
  '{{current_date}}': new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  '{{customer_name}}': 'Dr Akinyi',
  '{{customer_email}}': 'customer@example.com',
  '{{subject_line}}': 'Subject line here',
  '{{content}}':
    '<p style="margin:0 0 14px 0;">Hello, I am checking in on the delivery schedule for our recent order. Could you confirm when the items will be ready?</p>',
}

export default function SettingsView() {
  const navigate = useNavigate()
  const { user, emailAliasId, logout } = useAuthStore()
  const { colors } = useTheme()
  const showSuccess = useToastSuccess()
  const showError = useToastError()
  const showInfo = useToastInfo()

  const { templates, syncDefaultTemplates, deleteTemplate, addTemplate } = useTemplateStore()

  const [tab, setTab] = useState<Tab>('profile')
  const [alias, setAlias] = useState<{ alias_email: string; display_name: string; is_active: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!emailAliasId) return
      try {
        const { data, error } = await supabase
          .from('email_aliases')
          .select('alias_email, display_name, is_active')
          .eq('id', emailAliasId)
          .single()
        if (!cancelled && !error && data) setAlias(data)
      } catch {
        // The profile tab still renders without the alias block.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [emailAliasId])

  const handleSyncTemplates = useCallback(async () => {
    setSyncing(true)
    try {
      const count = await syncDefaultTemplates()
      showSuccess(`Restored ${count} default template${count === 1 ? '' : 's'}`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not restore templates')
    } finally {
      setSyncing(false)
    }
  }, [syncDefaultTemplates, showSuccess, showError])

  const handleDeleteTemplate = useCallback(
    async (template: EmailTemplate) => {
      try {
        await deleteTemplate(template.id)
        setPreviewTemplate((current) => (current?.id === template.id ? null : current))
        showSuccess(`Deleted “${template.name}”`)
      } catch {
        showError('Could not delete that template')
      }
    },
    [deleteTemplate, showSuccess, showError]
  )

  const handleCreateTemplate = useCallback(async () => {
    const name = window.prompt('Name for the new template')
    if (!name) return

    const bodyHtml =
      '<p style="margin:0 0 14px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">{{content}}</p>'

    try {
      await addTemplate({
        name,
        description: 'Custom template',
        subject: '',
        bodyHtml,
        bodyText: '{{content}}',
        category: 'general',
      })
      showSuccess(`Created “${name}”`)
    } catch {
      showError('Could not create that template')
    }
  }, [addTemplate, showSuccess, showError])

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      showError('The new passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showSuccess('Password updated')
    } catch (error) {
      const code = (error as { code?: string })?.code
      showError(
        code === 'auth/wrong-password'
          ? 'Your current password is incorrect'
          : 'Could not change your password'
      )
    } finally {
      setChangingPassword(false)
    }
  }, [currentPassword, newPassword, confirmPassword, showSuccess, showError])

  // ── Preview overlay ─────────────────────────────────────────────
  if (previewTemplate) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div
          className="flex items-center gap-3 flex-shrink-0"
          style={{
            height: 56,
            padding: '0 16px',
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.divider}`,
          }}
        >
          <IconButton label="Close preview" size={34} onClick={() => setPreviewTemplate(null)}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="min-w-0">
            <h1 className="font-semibold truncate" style={{ fontSize: fontSize.lg, color: colors.textPrimary }}>
              {previewTemplate.name}
            </h1>
            {previewTemplate.subject && (
              <div className="truncate" style={{ fontSize: fontSize.sm, color: colors.textTertiary }}>
                {previewTemplate.subject}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <TemplatePreview html={previewTemplate.bodyHtml} variables={PREVIEW_VARS} />
        </div>
      </div>
    )
  }

  const legacyCount = templates.filter((t) => hasLegacyPlaceholder(t.bodyHtml)).length

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{
          height: 56,
          padding: '0 16px',
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <IconButton label="Back to inbox" size={34} onClick={() => navigate('/inbox')}>
          <ArrowLeft size={18} />
        </IconButton>
        <h1 className="font-semibold" style={{ fontSize: fontSize.xl, color: colors.textPrimary }}>
          Settings
        </h1>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 flex-shrink-0 px-4"
        style={{ borderBottom: `1px solid ${colors.divider}`, backgroundColor: colors.surface }}
      >
        {([
          { key: 'profile', label: 'Profile', Icon: User },
          { key: 'templates', label: 'Email Templates', Icon: FileText },
        ] as const).map(({ key, label, Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={active ? 'page' : undefined}
              className="flex items-center gap-2 font-medium cursor-pointer transition-colors"
              style={{
                height: 46,
                padding: '0 12px',
                fontSize: fontSize.base,
                color: active ? colors.primary : colors.textSecondary,
                borderBottom: `2px solid ${active ? colors.primary : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 p-6">
        <div className="mx-auto" style={{ maxWidth: 860 }}>
          {tab === 'profile' ? (
            <div className="flex flex-col gap-5">
              {/* Account */}
              <Card title="Account" icon={<User size={16} />}>
                <Row label="Email address" value={user?.email ?? '—'} />
                <Row label="Role" value={user?.role ?? '—'} />
              </Card>

              {/* Alias */}
              <Card title="Email alias" icon={<Mail size={16} />}>
                {alias ? (
                  <>
                    <Row label="Alias" value={alias.alias_email} />
                    <Row label="Display name" value={alias.display_name || '—'} />
                    <Row
                      label="Status"
                      value={alias.is_active ? 'Active' : 'Inactive'}
                      tone={alias.is_active ? 'success' : 'muted'}
                    />
                  </>
                ) : (
                  <Skeleton width="60%" height={14} />
                )}
              </Card>

              {/* Password */}
              <Card title="Change password" icon={<KeyRound size={16} />}>
                <div className="grid gap-3" style={{ maxWidth: 420 }}>
                  <Field
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                  />
                  <Field
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                  />
                  <Field
                    label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                  />
                  <div>
                    <Button
                      variant="primary"
                      onClick={handleChangePassword}
                      loading={changingPassword}
                      disabled={!currentPassword || !newPassword || !confirmPassword}
                    >
                      Update password
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Danger */}
              <Card title="Session" icon={<ShieldCheck size={16} />}>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Sign out of this mailbox on this device.
                  </p>
                  <Button variant="danger" onClick={() => logout()} leadingIcon={<LogOut size={15} />}>
                    Sign out
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Brand summary */}
              <Card title="Brand used in templates" icon={<Mail size={16} />}>
                <div className="flex items-start gap-4">
                  <img
                    src="https://res.cloudinary.com/dxb22swfg/image/upload/v1765747561/Asset_4_v5ksi6.png"
                    alt="Sternmed Afrika"
                    width={150}
                    style={{ height: 'auto' }}
                  />
                  <div className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                    <div>
                      <strong style={{ color: colors.textPrimary }}>{COMPANY.legalName}</strong>
                    </div>
                    <div>{COMPANY.tagline}</div>
                    <div className="mt-2">
                      {COMPANY.phone} · {COMPANY.supportEmail}
                    </div>
                    <div>{COMPANY.website}</div>
                  </div>
                </div>

                {hasBrandPlaceholder(COMPANY.addressLine1) && (
                  <div
                    className="flex items-start gap-2 mt-4 p-3 rounded-lg"
                    style={{ backgroundColor: colors.warningBg }}
                  >
                    <AlertTriangle
                      size={16}
                      style={{ color: colors.warning, flexShrink: 0, marginTop: 1 }}
                    />
                    <p className="text-sm" style={{ color: colors.warning }}>
                      The postal address still contains placeholder text. Replace it in{' '}
                      <code>src/config/brand.ts</code> before sending customer mail.
                    </p>
                  </div>
                )}
              </Card>

              {/* Toolbar */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleSyncTemplates}
                  loading={syncing}
                  leadingIcon={<RefreshCw size={15} />}
                >
                  Restore default templates
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateTemplate}
                  leadingIcon={<Plus size={15} />}
                >
                  New template
                </Button>
                <div className="flex-1" />
                <span className="text-sm" style={{ color: colors.textTertiary }}>
                  {templates.length} template{templates.length === 1 ? '' : 's'}
                </span>
              </div>

              {legacyCount > 0 && (
                <div
                  className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: colors.warningBg }}
                >
                  <AlertTriangle size={16} style={{ color: colors.warning, flexShrink: 0, marginTop: 1 }} />
                  <p className="text-sm" style={{ color: colors.warning }}>
                    {legacyCount} template{legacyCount === 1 ? ' still contains' : 's still contain'}{' '}
                    placeholders the sender never fills in, so they reach the customer verbatim. Use
                    “Restore default templates” to replace {legacyCount === 1 ? 'it' : 'them'}.
                  </p>
                </div>
              )}

              {/* Template grid */}
              {templates.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center text-center"
                  style={{ padding: '56px 24px' }}
                >
                  <FileText size={26} style={{ color: colors.textTertiary, marginBottom: 12 }} />
                  <p style={{ fontSize: fontSize.lg, fontWeight: 600, color: colors.textPrimary }}>
                    No templates yet
                  </p>
                  <p className="mt-1" style={{ fontSize: fontSize.base, color: colors.textSecondary }}>
                    Restore the branded defaults to get started.
                  </p>
                  <div className="mt-4">
                    <Button variant="primary" onClick={handleSyncTemplates} loading={syncing}>
                      Restore default templates
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {templates.map((template) => {
                    const isLegacy = hasLegacyPlaceholder(template.bodyHtml)

                    return (
                      <div
                        key={template.id}
                        className="flex flex-col"
                        style={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.lg,
                          overflow: 'hidden',
                        }}
                      >
                        <div className="flex items-start gap-2 p-4">
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-semibold truncate"
                              style={{ fontSize: fontSize.md, color: colors.textPrimary }}
                            >
                              {template.name}
                            </div>
                            {template.description && (
                              <div
                                className="truncate"
                                style={{ fontSize: fontSize.sm, color: colors.textTertiary }}
                              >
                                {template.description}
                              </div>
                            )}
                          </div>

                          {isLegacy && (
                            <span
                              className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: colors.warningBg,
                                color: colors.warning,
                                fontSize: fontSize.xs,
                              }}
                            >
                              <AlertTriangle size={11} />
                              Placeholders
                            </span>
                          )}
                          {template.isDefault && !isLegacy && (
                            <span
                              className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: colors.successBg,
                                color: colors.success,
                                fontSize: fontSize.xs,
                              }}
                            >
                              <CheckCircle2 size={11} />
                              Ready
                            </span>
                          )}
                        </div>

                        <div
                          className="px-4 pb-3 text-sm truncate"
                          style={{ color: colors.textTertiary }}
                        >
                          Subject: {template.subject || '(uses what you type)'}
                        </div>

                        <div
                          className="flex items-center gap-1 mt-auto px-3 py-2"
                          style={{ borderTop: `1px solid ${colors.divider}` }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewTemplate(template)}
                            leadingIcon={<Eye size={15} />}
                          >
                            Preview
                          </Button>
                          <div className="flex-1" />
                          <IconButton
                            label={`Delete ${template.name}`}
                            size={30}
                            tone="danger"
                            onClick={() => handleDeleteTemplate(template)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small local building blocks ───────────────────────────────────

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const { colors } = useTheme()
  return (
    <section
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: `1px solid ${colors.divider}` }}
      >
        {icon && <span style={{ color: colors.textTertiary }}>{icon}</span>}
        <h2 className="font-semibold" style={{ fontSize: fontSize.md, color: colors.textPrimary }}>
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'muted' }) {
  const { colors } = useTheme()
  return (
    <div
      className="flex items-baseline gap-4 py-2"
      style={{ borderBottom: `1px solid ${colors.divider}` }}
    >
      <span className="w-36 flex-shrink-0" style={{ fontSize: fontSize.base, color: colors.textSecondary }}>
        {label}
      </span>
      <span
        className="flex-1 truncate"
        style={{
          fontSize: fontSize.base,
          color:
            tone === 'success'
              ? colors.success
              : tone === 'muted'
                ? colors.textTertiary
                : colors.textPrimary,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  type?: string
  autoComplete?: string
}) {
  const { colors } = useTheme()
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="outline-none"
        style={{
          height: 38,
          padding: '0 12px',
          borderRadius: radius.md,
          border: `1px solid ${colors.borderStrong}`,
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          fontSize: fontSize.base,
        }}
      />
    </label>
  )
}