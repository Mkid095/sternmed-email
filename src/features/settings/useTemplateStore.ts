/**
 * Email Template Store
 *
 * Manages email templates for consistent branding.
 *
 * @module features/settings/useTemplateStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Email template structure
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
} as const

/**
 * Template store state and actions
 */
interface TemplateStore {
  /** All templates */
  templates: EmailTemplate[]
  /** Currently selected template ID for compose */
  selectedTemplateId: string | null
  /** Add a new template */
  addTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isDefault'>) => void
  /** Update an existing template */
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => void
  /** Delete a template */
  deleteTemplate: (id: string) => void
  /** Select a template for use in compose */
  selectTemplate: (id: string | null) => void
  /** Get template by ID */
  getTemplate: (id: string) => EmailTemplate | undefined
  /** Replace placeholders in template with actual values */
  applyTemplate: (templateId: string, variables: Record<string, string>) => { subject: string; bodyHtml: string; bodyText: string }
}

// Default templates provided by the system
const defaultTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Send a warm welcome to new customers',
    subject: 'Welcome to {{company_name}}!',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #17487a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">{{company_name}}</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #17487a; margin-top: 0;">Welcome, {{customer_name}}!</h2>
          <p>Thank you for choosing {{company_name}}. We're excited to have you on board.</p>
          <p>If you have any questions, feel free to contact us at:</p>
          <ul>
            <li><strong>Email:</strong> {{company_email}}</li>
            <li><strong>Phone:</strong> {{company_phone}}</li>
            <li><strong>Website:</strong> {{website}}</li>
          </ul>
          <p>Best regards,<br/>The {{company_name}} Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
          <p>{{company_address}}</p>
          <p>&copy; ${new Date().getFullYear()} {{company_name}}. All rights reserved.</p>
        </div>
      </div>
    `,
    bodyText: `
Welcome to {{company_name}}!

Thank you for choosing {{company_name}}. We're excited to have you on board.

If you have any questions, feel free to contact us at:
- Email: {{company_email}}
- Phone: {{company_phone}}
- Website: {{website}}

Best regards,
The {{company_name}} Team

---
{{company_address}}
© ${new Date().getFullYear()} {{company_name}}. All rights reserved.
    `,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'quote',
    name: 'Quote Request',
    description: 'Send a price quote to a customer',
    subject: 'Price Quote from {{company_name}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #17487a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">{{company_name}}</h1>
          <p style="color: #e0e0e0; margin: 5px 0 0;">Price Quote</p>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #17487a;">Dear {{customer_name}},</h2>
          <p>Please find below your requested price quote:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Quantity</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">[Product/Service Description]</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">[Qty]</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">[Price]</td>
              </tr>
            </tbody>
          </table>

          <p><strong>Total: [Total Amount]</strong></p>
          <p>This quote is valid for 30 days.</p>
          <p>If you have any questions or would like to proceed, please contact us at {{company_email}} or {{company_phone}}.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
          <p>{{company_address}}</p>
          <p>&copy; ${new Date().getFullYear()} {{company_name}}. All rights reserved.</p>
        </div>
      </div>
    `,
    bodyText: `
Dear {{customer_name}},

Please find below your requested price quote:

[Product/Service Description] - [Qty] x [Price] = [Total]

Total: [Total Amount]

This quote is valid for 30 days.

If you have any questions, please contact us at {{company_email}} or {{company_phone}}.

Best regards,
{{company_name}}

---
{{company_address}}
© ${new Date().getFullYear()} {{company_name}}. All rights reserved.
    `,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'followup',
    name: 'Follow-up',
    description: 'Follow up with a customer after initial contact',
    subject: 'Following up - {{company_name}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #17487a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">{{company_name}}</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #17487a; margin-top: 0;">Hello {{customer_name}},</h2>
          <p>I hope this email finds you well. I'm following up on our recent communication regarding [topic].</p>
          <p>Do you have any questions or need additional information? I'm here to help.</p>
          <p>You can reach me at:</p>
          <ul>
            <li><strong>Email:</strong> {{company_email}}</li>
            <li><strong>Phone:</strong> {{company_phone}}</li>
          </ul>
          <p>Looking forward to hearing from you.</p>
          <p>Best regards,<br/>[Your Name]<br/>{{company_name}}</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
          <p>{{company_address}}</p>
          <p>&copy; ${new Date().getFullYear()} {{company_name}}. All rights reserved.</p>
        </div>
      </div>
    `,
    bodyText: `
Hello {{customer_name}},

I hope this email finds you well. I'm following up on our recent communication regarding [topic].

Do you have any questions or need additional information? I'm here to help.

You can reach me at:
- Email: {{company_email}}
- Phone: {{company_phone}}

Looking forward to hearing from you.

Best regards,
[Your Name]
{{company_name}}

---
{{company_address}}
© ${new Date().getFullYear()} {{company_name}}. All rights reserved.
    `,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      selectedTemplateId: null,

      addTemplate: (template) => {
        const newTemplate: EmailTemplate = {
          ...template,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: false,
        }
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }))
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }))
      },

      deleteTemplate: (id) => {
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
