/**
 * Professional — the default branded template.
 *
 * Design rule for this file: a template is a FRAME, not a document.
 *
 * The earlier version of this file injected marketing copy into every message
 * ("Why clients choose us", a numbered VALUE_PROPS list, "If there is anything
 * else we can help with…"). That is fine on a brochure and wrong on a
 * mailbox: it put words in the sender's mouth on every reply, from a one-line
 * availability note to a supplier negotiation.
 *
 * So each layout here is only: the branded frame from shell.ts, then the
 * sender's own words. No greeting the sender did not write, no sign-off they
 * did not write, no claims they did not make. If they want a greeting they
 * type one.
 *
 * {{content}} is where the typed message is injected, and it carries its own
 * font and spacing so the body reads consistently whichever template is used.
 */

import { renderEmailShell, EMAIL_FONT } from '../shell'
import { BRAND_COLORS } from '../../config/brand'

/**
 * The one place the sender's text is rendered, so every template inherits the
 * same typography and rhythm. Inline styles only — email clients strip <style>
 * blocks, so this has to live on the element.
 */
function messageBlock(content: string): string {
  return `<tr>
  <td style="padding:30px 32px 30px 32px;font-family:${EMAIL_FONT};font-size:15px;line-height:1.75;color:${BRAND_COLORS.textBody};">
    ${content}
  </td>
</tr>`
}

export const professionalTemplate = {
  id: 'professional',
  name: 'Professional',
  description: 'Branded letterhead with your message — everyday business correspondence',
  subject: '',
  bodyHtml: renderEmailShell({
    preheader: 'A message from {{company_name}}',
    content: messageBlock('{{content}}'),
  }),
  bodyText: `{{content}}`,
  category: 'general',
  isDefault: true,
}

/**
 * Formal — the same frame with a hairline rule above the body, for institutional
 * correspondence (tenders, letters of intent). Differentiates by restraint
 * rather than by adding content.
 */
const formalBody = `
<tr>
  <td style="padding:0 32px 22px 32px;">
    <div style="height:1px;background-color:${BRAND_COLORS.border};"></div>
  </td>
</tr>
${messageBlock('{{content}}')}`

export const formalTemplate = {
  id: 'formal',
  name: 'Formal',
  description: 'Ruled letterhead — tenders, letters of intent, official correspondence',
  subject: '',
  bodyHtml: renderEmailShell({
    preheader: 'A message from {{company_name}}',
    content: formalBody,
  }),
  bodyText: `{{content}}`,
  category: 'general',
  isDefault: true,
}

/**
 * Announcement — an accent band carrying the subject line, so a notice reads as
 * a notice the moment it is opened. The band is chrome, not copy: the sender
 * still writes the message.
 */
const announcementBody = `
<tr>
  <td style="padding:26px 32px 22px 32px;background-color:${BRAND_COLORS.accentSoft};border-left:4px solid ${BRAND_COLORS.accent};">
    <p style="margin:0;font-family:${EMAIL_FONT};font-size:18px;line-height:1.4;font-weight:600;color:${BRAND_COLORS.accentText};">
      {{subject_line}}
    </p>
  </td>
</tr>
${messageBlock('{{content}}')}
`

export const announcementTemplate = {
  id: 'announcement',
  name: 'Announcement',
  description: 'Accent-headed notice — news, offers, availability updates',
  subject: '',
  bodyHtml: renderEmailShell({
    preheader: 'From {{company_name}}',
    content: announcementBody,
    compact: true,
  }),
  bodyText: `{{subject_line}}

{{content}}`,
  category: 'notification',
  isDefault: true,
}

/**
 * Plain — no logo band at all, just the message and the footer. For short
 * replies where branding should stay out of the way.
 */
export const simpleTemplate = {
  id: 'simple',
  name: 'Plain',
  description: 'No letterhead — short replies where branding should stay quiet',
  subject: '',
  bodyHtml: renderEmailShell({
    preheader: '',
    content: messageBlock('{{content}}'),
    compact: true,
    hideHeader: true,
  }),
  bodyText: `{{content}}`,
  category: 'general',
  isDefault: true,
}