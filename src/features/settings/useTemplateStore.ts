/**
 * Email Template Store
 *
 * Manages email templates for consistent branding.
 * Uses separate template layout files for default templates.
 *
 * @module features/settings/useTemplateStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../../config/supabase'
import { defaultLayoutTemplates, type TemplateLayout } from '../../templates/layouts'

/**
 * Email template structure (camelCase for TypeScript)
 * Database uses snake_case: body_html, body_text, is_system, created_at, updated_at
 */
export interface EmailTemplate {
  /** Unique identifier */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description?: string
  /** Default subject line (can include placeholders) */
  subject: string
  /** HTML body template */
  bodyHtml: string
  /** Plain text fallback */
  bodyText: string
  /** Template category */
  category: string
  /** Whether this is a system default template */
  isDefault: boolean
  /** Created at timestamp */
  createdAt: string
  /** Updated at timestamp */
  updatedAt: string
}

/**
 * Template placeholders that can be replaced
 */
export const TEMPLATE_VARIABLES = {
  COMPANY_NAME: '{{company_name}}',
  COMPANY_ADDRESS: '{{company_address}}',
  COMPANY_PHONE: '{{company_phone}}',
  COMPANY_EMAIL: '{{company_email}}',
  WEBSITE: '{{website}}',
  CURRENT_DATE: '{{current_date}}',
  CUSTOMER_NAME: '{{customer_name}}',
  CUSTOMER_EMAIL: '{{customer_email}}',
  CONTENT: '{{content}}',
} as const

/**
 * Convert a TemplateLayout to EmailTemplate format
 */
function layoutToTemplate(layout: TemplateLayout): EmailTemplate {
  return {
    id: layout.id,
    name: layout.name,
    description: layout.description,
    subject: layout.subject,
    bodyHtml: layout.bodyHtml,
    bodyText: layout.bodyText,
    category: layout.category,
    isDefault: layout.isDefault,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Template store state and actions
 */
interface TemplateStore {
  /** All templates */
  templates: EmailTemplate[]
  /** Currently selected template ID for compose */
  selectedTemplateId: string | null
  /** Fetch templates from Supabase (used on app load) */
  fetchTemplates: () => Promise<void>
  /** Add a new template */
  addTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isDefault'>) => Promise<void>
  /** Update an existing template */
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => Promise<void>
  /** Delete a template */
  deleteTemplate: (id: string) => Promise<void>
  /** Select a template for use in compose */
  selectTemplate: (id: string | null) => void
  /** Get template by ID */
  getTemplate: (id: string) => EmailTemplate | undefined
  /** Replace placeholders in template with actual values */
  applyTemplate: (templateId: string, variables: Record<string, string>) => { subject: string; bodyHtml: string; bodyText: string }
}

// Convert layout templates to store format
const defaultTemplates: EmailTemplate[] = defaultLayoutTemplates.map(layoutToTemplate)

// Helper: Convert DB format (snake_case) to store format (camelCase)
function dbToTemplate(db: any): EmailTemplate {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    subject: db.subject,
    bodyHtml: db.body_html,
    bodyText: db.body_text,
    category: db.category,
    isDefault: db.is_system,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

// Helper: Convert store format (camelCase) to DB format (snake_case) for inserts/updates
function templateToDb(template: Partial<EmailTemplate>, isSystem?: boolean): any {
  return {
    name: template.name,
    subject: template.subject,
    body_html: template.bodyHtml,
    body_text: template.bodyText,
    category: template.category || 'general',
    is_system: isSystem ?? false,
    updated_at: new Date().toISOString(),
  }
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      selectedTemplateId: null,

      // Fetch templates from Supabase on app load
      fetchTemplates: async () => {
        try {
          const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .order('name')

          if (error) throw error

          if (data && data.length > 0) {
            const dbTemplates = data.map(dbToTemplate)
            set({ templates: dbTemplates })
          }
        } catch (err) {
          console.error('Failed to fetch templates from Supabase:', err)
          // Keep default templates as fallback
        }
      },

      // Add template and persist to DB
      addTemplate: async (template) => {
        const { data, error } = await supabase
          .from('email_templates')
          .insert([templateToDb(template, false)])
          .select()
          .single()

        if (error) throw error

        if (data) {
          const newTemplate = dbToTemplate(data)
          set((state) => ({
            templates: [...state.templates, newTemplate],
          }))
        }
      },

      // Update template in DB
      updateTemplate: async (id, updates) => {
        const { data, error } = await supabase
          .from('email_templates')
          .update(templateToDb(updates, false))
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        if (data) {
          const updatedTemplate = dbToTemplate(data)
          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === id ? updatedTemplate : t
            ),
          }))
        }
      },

      // Delete template from DB
      deleteTemplate: async (id) => {
        const { error } = await supabase
          .from('email_templates')
          .delete()
          .eq('id', id)

        if (error) throw error

        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
        }))
      },

      selectTemplate: (id) => {
        set({ selectedTemplateId: id })
      },

      getTemplate: (id) => {
        return get().templates.find((t) => t.id === id)
      },

      applyTemplate: (templateId, variables) => {
        const template = get().getTemplate(templateId)
        if (!template) {
          throw new Error(`Template ${templateId} not found`)
        }

        let subject = template.subject
        let bodyHtml = template.bodyHtml
        let bodyText = template.bodyText

        // Replace all placeholders
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = TEMPLATE_VARIABLES[key as keyof typeof TEMPLATE_VARIABLES]
          if (placeholder) {
            subject = subject.replace(new RegExp(placeholder, 'g'), value)
            bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), value)
            bodyText = bodyText.replace(new RegExp(placeholder, 'g'), value)
          }
        })

        // Replace current date if placeholder exists
        const currentDate = new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        subject = subject.replace(/\{\{current_date\}\}/g, currentDate)
        bodyHtml = bodyHtml.replace(/\{\{current_date\}\}/g, currentDate)
        bodyText = bodyText.replace(/\{\{current_date\}\}/g, currentDate)

        return { subject, bodyHtml, bodyText }
      },
    }),
    {
      name: 'sternmed-email-templates',
    }
  )
)
