/**
 * Email Template Layouts
 *
 * Collection of professionally designed email template layouts
 * Each template defines a complete HTML email with branding
 */

export { welcomeTemplate } from './welcome-template'
export { quoteTemplate } from './quote-template'
export { followupTemplate } from './followup-template'
export { thankYouTemplate } from './thank-you-template'
export { standardEmailTemplate } from './standard-email-template'

import { welcomeTemplate } from './welcome-template'
import { quoteTemplate } from './quote-template'
import { followupTemplate } from './followup-template'
import { thankYouTemplate } from './thank-you-template'
import { standardEmailTemplate } from './standard-email-template'

/**
 * All default template layouts
 */
export const defaultLayoutTemplates = [
  welcomeTemplate,
  quoteTemplate,
  followupTemplate,
  thankYouTemplate,
  standardEmailTemplate,
] as const

export type TemplateLayout = typeof defaultLayoutTemplates[number]
