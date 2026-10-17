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
  /** Announcement templates render this as their headline. */
  SUBJECT_LINE: '{{subject_line}}',
  CONTENT: '{{content}}',
} as const

/**
 * Legacy token names used by the old domain-specific templates. Anything
 * still referencing these shipped unresolved placeholders such as
 * "{{invoice_number}}" straight to customers.
 */
export const LEGACY_TEMPLATE_VARIABLES = [
  '{{invoice_number}}',
  '{{amount}}',
  '{{name}}',
  '{{order_number}}',
  '{{order_date}}',
  '{{items}}',
  '{{total}}',
  '{{quote_number}}',
  '{{valid_until}}',
  '{{product}}',
  '{{delivery_date}}',
] as const

/** True when a template still carries an unresolved legacy placeholder. */
export function hasLegacyPlaceholder(html: string): boolean {
  return LEGACY_TEMPLATE_VARIABLES.some((token) => html.includes(token))
}

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
  /**
   * Write the built-in branded templates to the database, removing the legacy
   * domain-specific ones. Safe to re-run.
   */
  syncDefaultTemplates: () => Promise<number>
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
    // Always undefined: email_templates has no description column. Kept so the
    // EmailTemplate shape stays intact for the built-ins, which do carry one.
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

/** Ids/names of the legacy domain templates the branded set replaces. */
const LEGACY_TEMPLATE_NAMES = [
  'Invoice',
  'Order Confirmation',
  'Quote Follow-up',
  'Welcome Email',
  'Welcome Customer',
  'Thank You',
  // The previous "Simple" layout was renamed to "Plain" when the built-ins were
  // stripped down. Without listing it here the sync would insert "Plain"
  // alongside the stale "Simple" row instead of replacing it.
  'Simple',
] as const

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

      /**
       * Write the built-in branded templates into the database and remove the
       * legacy domain-specific ones.
       *
       * The DB predates the branded templates and still held "Invoice",
       * "Order Confirmation" and friends, which rendered unresolved
       * {{invoice_number}} / {{amount}} tokens to customers. This makes the
       * database match the code, and can be re-run after editing the
       * built-ins in src/templates/layouts.
       *
       * Two constraints shape the implementation:
       *
       *   * `email_outbound.template_id` is a real foreign key with no ON
       *     DELETE clause. Deleting a template that any sent or drafted email
       *     references fails with a 409, which is why this used to break the
       *     button outright. Legacy rows are therefore unreferenced first.
       *   * Built-ins are UPDATED in place, never deleted and reinserted.
       *     That keeps their ids stable so existing emails keep pointing at
       *     the template they were actually sent with.
       */
      syncDefaultTemplates: async () => {
        const legacyNames = [...LEGACY_TEMPLATE_NAMES]
        const builtinNames = defaultLayoutTemplates.map((t) => t.name)

        if (legacyNames.length > 0) {
          const { data: legacyRows } = await supabase
            .from('email_templates')
            .select('id')
            .in('name', legacyNames)

          const legacyIds = (legacyRows ?? []).map((row) => row.id)

          if (legacyIds.length > 0) {
            // Detach first. The email keeps its body; only the pointer to a
            // template that no longer exists is cleared.
            const { error: detachError } = await supabase
              .from('email_outbound')
              .update({ template_id: null })
              .in('template_id', legacyIds)
            if (detachError) throw detachError

            const { error: deleteError } = await supabase
              .from('email_templates')
              .delete()
              .in('id', legacyIds)
            if (deleteError) throw deleteError
          }
        }

        const { data: existing, error: readError } = await supabase
          .from('email_templates')
          .select('id,name')
          .in('name', builtinNames)

        if (readError) throw readError

        const idByName = new Map((existing ?? []).map((row) => [row.name, row.id]))
        const now = new Date().toISOString()

        const toUpdate: Array<{ id: string; body: Record<string, unknown> }> = []
        const toInsert: Array<Record<string, unknown>> = []

        for (const layout of defaultLayoutTemplates) {
          const body = {
            subject: layout.subject,
            body_html: layout.bodyHtml,
            body_text: layout.bodyText,
            // `description` is deliberately absent: email_templates has no
            // such column, and including it makes PostgREST reject the whole
            // write with a 400 — which silently left every built-in stale.
            category: layout.category || 'general',
            is_system: true,
            updated_at: now,
          }
          const existingId = idByName.get(layout.name)
          if (existingId) {
            toUpdate.push({ id: existingId, body })
          } else {
            toInsert.push({ name: layout.name, ...body })
          }
        }

        // One PATCH per row. PostgREST rejects a bulk update sent as a JSON
        // array with "UPDATE requires a WHERE clause" (SQLSTATE 21000), so the
        // primary key has to travel in the filter rather than the payload.
        for (const { id, body } of toUpdate) {
          const { error } = await supabase.from('email_templates').update(body).eq('id', id)
          if (error) throw error
        }

        if (toInsert.length > 0) {
          const { error } = await supabase.from('email_templates').insert(toInsert)
          if (error) throw error
        }

        // Re-read rather than reconstructing from the layouts: the ids and
        // timestamps must come from what the database actually stored.
        const { data: refreshed, error: rereadError } = await supabase
          .from('email_templates')
          .select('*')
          .in('name', builtinNames)

        if (rereadError) throw rereadError

        const synced = (refreshed ?? []).map(dbToTemplate)

        // Keep the selection pointing at the same template by name, since the
        // row ids survive but callers hold ids from the previous load.
        set((state) => ({
          templates: synced,
          selectedTemplateId:
            synced.find((t) => t.name === state.templates.find((p) => p.id === state.selectedTemplateId)?.name)
              ?.id ?? null,
        }))

        return synced.length
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
