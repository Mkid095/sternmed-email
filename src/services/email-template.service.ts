/**
 * Email Template Service
 *
 * Generates professionally branded email HTML and plain text for outgoing emails.
 * Applies Sternmed Afrika branding and contact information.
 *
 * @module services/email-template
 */

/**
 * Company branding configuration
 */
const COMPANY_BRAND = {
  name: 'Sternmed Afrika',
  tagline: 'Medical Equipment Solutions',
  website: 'https://sternmedafrika.com',
  email: 'info@sternmedafrika.com',
  phone: '+254 700 000 000',
  address: 'P.O. Box [Your P.O. Box], Nairobi, Kenya',
  businessHours: 'Mon - Fri: 8:00 AM - 6:00 PM\nSat: 9:00 AM - 2:00 PM',
}

/**
 * Format current date for display
 */
function getCurrentDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Escape HTML special characters in plain text content
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Convert plain text to HTML with basic line breaks
 */
function plainToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

/**
 * Generate professional email HTML with branding
 */
export function generateEmailHtml(content: string, subject?: string, includeHeader: boolean = true): string {
  const date = getCurrentDate()

  // If no explicit content, create a basic message
  const emailContent = content || 'Please review this message.'

  // Generate the HTML
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
  ${includeHeader ? `
  <!-- Professional Header with Company Branding -->
  <div style="background: linear-gradient(135deg, #1a5f7a 0%, #2d8f9e 100%); padding: 40px 30px; text-align: center;">
    <div style="margin-bottom: 15px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
        ${escapeHtml(COMPANY_BRAND.name)}
      </h1>
      <p style="color: #e0f2fe; margin: 8px 0 0; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
        ${escapeHtml(COMPANY_BRAND.tagline)}
      </p>
    </div>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
      <p style="margin: 0; color: #bae6fd; font-size: 13px;">
        <a href="${COMPANY_BRAND.website}" style="color: #ffffff; text-decoration: none; font-weight: 500;">${escapeHtml(COMPANY_BRAND.website.replace('https://', ''))}</a>
      </p>
    </div>
  </div>
  ` : ''}

  <!-- Email Content Body -->
  <div style="padding: 40px 30px; background-color: #ffffff;">
    <div style="line-height: 1.7; color: #374151; font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${emailContent.includes('<') ? emailContent : plainToHtml(emailContent)}
    </div>
  </div>

  <!-- Professional Footer -->
  <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; padding-right: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h3 style="color: #1a5f7a; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Contact Information</h3>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <strong style="color: #475569;">Email:</strong><br/>
            <a href="mailto:${COMPANY_BRAND.email}" style="color: #0284c7; text-decoration: none;">${escapeHtml(COMPANY_BRAND.email)}</a>
          </p>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <strong style="color: #475569;">Phone:</strong><br/>
            ${escapeHtml(COMPANY_BRAND.phone)}
          </p>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <strong style="color: #475569;">Website:</strong><br/>
            <a href="${COMPANY_BRAND.website}" style="color: #0284c7; text-decoration: none;">${escapeHtml(COMPANY_BRAND.website.replace('https://', ''))}</a>
          </p>
        </td>
        <td style="vertical-align: top; padding-left: 20px; border-left: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h3 style="color: #1a5f7a; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Office</h3>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <strong style="color: #475569;">${escapeHtml(COMPANY_BRAND.name)}</strong><br/>
            ${escapeHtml(COMPANY_BRAND.address)}
          </p>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <strong style="color: #475569;">Business Hours:</strong><br/>
            ${COMPANY_BRAND.businessHours.split('\n').map(line => escapeHtml(line)).join('<br/>')}
          </p>
        </td>
      </tr>
    </table>

    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        &copy; ${date} <strong style="color: #475569;">${escapeHtml(COMPANY_BRAND.name)} Limited</strong>. All rights reserved.<br/>
        This email and any attachments are confidential and intended solely for the addressee.
      </p>
    </div>
  </div>
</div>
  `.trim()
}

/**
 * Generate plain text email with branding
 */
export function generateEmailText(content: string, subject?: string): string {
  const date = getCurrentDate()

  return `
${COMPANY_BRAND.name}
${COMPANY_BRAND.tagline}
${'─'.repeat(50)}

${content}

${'─'.repeat(50)}
Contact Information:
Email: ${COMPANY_BRAND.email}
Phone: ${COMPANY_BRAND.phone}
Website: ${COMPANY_BRAND.website}

Office:
${COMPANY_BRAND.name} Limited
${COMPANY_BRAND.address}

Business Hours:
${COMPANY_BRAND.businessHours}

© ${date} ${COMPANY_BRAND.name} Limited. All rights reserved.
This email and any attachments are confidential and intended solely for the addressee.
  `.trim()
}

/**
 * Full email generation - returns both HTML and text versions
 */
export function generateEmail(body: string, subject?: string, includeHeader: boolean = true): {
  bodyHtml: string
  bodyText: string
} {
  return {
    bodyHtml: generateEmailHtml(body, subject, includeHeader),
    bodyText: generateEmailText(body, subject),
  }
}
