/**
 * Email Template Layouts
 *
 * Branded, general-purpose templates. These replaced the previous set, which
 * were domain-specific (invoice, order confirmation, quote) and shipped
 * unresolved placeholders such as {{invoice_number}} and {{amount}}.
 *
 * Every template is a full HTML document built by ../shell, so the preview
 * renders exactly what a mail client will receive.
 */

export {
  professionalTemplate,
  formalTemplate,
  announcementTemplate,
  simpleTemplate,
} from './professional-template'

import {
  professionalTemplate,
  formalTemplate,
  announcementTemplate,
  simpleTemplate,
} from './professional-template'

export const defaultLayoutTemplates = [
  professionalTemplate,
  formalTemplate,
  announcementTemplate,
  simpleTemplate,
] as const

export type TemplateLayout = (typeof defaultLayoutTemplates)[number]