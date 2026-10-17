/**
 * Email shell
 *
 * Builds the outer chrome every template shares. Written the way email HTML
 * has to be written, not the way a web page would be:
 *
 *  - Tables for layout. Outlook (Word rendering engine) ignores flexbox and
 *    grid outright.
 *  - All styling inline. <style> blocks are stripped by many clients.
 *  - A 600px content column, the safe width across desktop and mobile clients.
 *  - A media query fallback plus the mso (Outlook) conditional for the
 *    full-width outer table.
 *  - Web fonts are NOT loaded: Outlook falls back unpredictably. An
 *    Arial/Helvetica stack is boring but it renders identically everywhere.
 */

import { BRAND_COLORS, BRAND_LOGO, COMPANY } from '../config/brand'

export const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export interface ShellOptions {
  /** Preheader: hidden inbox-preview text. Keep under 100 characters. */
  preheader: string
  /** Everything inside the white content card, already HTML. */
  content: string
  /** Optional call-to-action button rendered above the content. */
  cta?: { label: string; url: string }
  /** Hide the address block for short transactional mail. */
  compact?: boolean
  /** Omit the logo header entirely — for replies where branding stays quiet. */
  hideHeader?: boolean
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** The address as a single line, or null when nothing is confirmed. */
function addressLine(): string | null {
  const parts = [COMPANY.addressLine2, COMPANY.addressLine1].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export function renderEmailShell(options: ShellOptions): string {
  const { preheader, content, cta, compact = false, hideHeader = false } = options
  const address = addressLine()

  const ctaBlock = cta
    ? `
        <tr>
          <td style="padding:4px 32px 28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${BRAND_COLORS.primary}" style="border-radius:8px;">
                  <a href="${escape(cta.url)}"
                     target="_blank"
                     style="display:inline-block;padding:13px 30px;font-family:${EMAIL_FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                    ${escape(cta.label)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : ''

  const addressBlock =
    !compact && address
      ? `
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${BRAND_COLORS.border};">
            <p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.7;color:${BRAND_COLORS.textMuted};">
              <strong style="color:${BRAND_COLORS.textStrong};">${escape(COMPANY.legalName)}</strong><br />
              ${escape(address)}<br />
              <a href="tel:${escape(COMPANY.phoneDigits)}" style="color:${BRAND_COLORS.link};text-decoration:none;">${escape(COMPANY.phone)}</a>
              &nbsp;·&nbsp;
              <a href="mailto:${escape(COMPANY.supportEmail)}" style="color:${BRAND_COLORS.link};text-decoration:none;">${escape(COMPANY.supportEmail)}</a>
            </p>
          </td>
        </tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escape(COMPANY.brandName)}</title>
<!--[if mso]>
<style type="text/css">body,table,td,p,a,ul,li{font-family:Arial,sans-serif !important;}</style>
<xml>
  <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<style type="text/css">
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  table { border-collapse:collapse !important; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { color:${BRAND_COLORS.link}; }
  @media only screen and (max-width:620px) {
    .sm-px-16 { padding-left:16px !important; padding-right:16px !important; }
    .sm-block { display:block !important; width:100% !important; }
    .sm-hide { display:none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_COLORS.pageBg};">

  <!-- Hidden preheader: what the inbox shows next to the subject -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escape(preheader)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${BRAND_COLORS.pageBg};">
    <tr>
      <td align="center" style="padding:28px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">

          <!-- Brand header. Logo sits on white: it is dark-on-transparent. -->
          ${
            hideHeader
              ? ''
              : `<tr>
            <td class="sm-px-16" style="padding:28px 32px 24px 32px;background-color:#ffffff;border-bottom:3px solid ${BRAND_COLORS.primary};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${escape(BRAND_LOGO.url)}"
                         alt="${escape(BRAND_LOGO.alt)}"
                         width="${BRAND_LOGO.width}"
                         style="display:block;width:${BRAND_LOGO.width}px;max-width:100%;height:auto;border:0;" />
                  </td>
                  <td align="right" valign="middle" class="sm-hide">
                    <span style="font-family:${EMAIL_FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND_COLORS.textMuted};">
                      ${escape(COMPANY.domain)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
          }

          <!-- Body -->
          ${content}
          ${ctaBlock}
          ${addressBlock}

          <!-- Footer -->
          <tr>
            <td class="sm-px-16" style="padding:20px 32px;background-color:${BRAND_COLORS.footerBg};border-top:1px solid ${BRAND_COLORS.border};">
              <p style="margin:0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.7;color:${BRAND_COLORS.textMuted};">
                &copy; ${new Date().getFullYear()} ${escape(COMPANY.legalName.replace(/\.$/, ''))}. All rights reserved.<br />
                <a href="${escape(COMPANY.website)}" target="_blank" style="color:${BRAND_COLORS.link};text-decoration:underline;">${escape(COMPANY.website.replace(/^https?:\/\//, ''))}</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

/** A section heading used inside template bodies. */
export function heading(text: string): string {
  return `<h1 style="margin:0 0 12px 0;font-family:${EMAIL_FONT};font-size:26px;line-height:1.3;font-weight:600;color:${BRAND_COLORS.textStrong};letter-spacing:-0.02em;">${escape(text)}</h1>`
}

/** A paragraph. `html` is trusted template content, not user input. */
export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px 0;font-family:${EMAIL_FONT};font-size:15px;line-height:1.7;color:${BRAND_COLORS.textBody};">${html}</p>`
}

/** A soft panel used for key details. */
export function panel(inner: string, tone: 'neutral' | 'accent' | 'success' = 'neutral'): string {
  const bg =
    tone === 'accent'
      ? BRAND_COLORS.accentSoft
      : tone === 'success'
        ? '#e9f7ef'
        : BRAND_COLORS.panelBg
  const border =
    tone === 'accent' ? '#fcd34d' : tone === 'success' ? '#a7f3d0' : BRAND_COLORS.border

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;background-color:${bg};border:1px solid ${border};border-radius:10px;">
            <tr><td style="padding:18px 20px;">${inner}</td></tr>
          </table>`
}

/** An unordered list styled for email. */
export function bulletList(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
           <td valign="top" style="padding:4px 0;font-size:15px;line-height:1.6;color:${BRAND_COLORS.textBody};">
             <span style="color:${BRAND_COLORS.primary};font-weight:700;">&bull;</span>
           </td>
           <td valign="top" style="padding:4px 0;font-family:${EMAIL_FONT};font-size:15px;line-height:1.6;color:${BRAND_COLORS.textBody};">${item}</td>
         </tr>`
    )
    .join('')

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${rows}</table>`
}

/** Key/value rows, for totals and reference numbers. */
export function dataTable(rows: Array<{ label: string; value: string; emphasis?: boolean }>): string {
  const body = rows
    .map(
      (row) => `<tr>
          <td style="padding:9px 0;font-family:${EMAIL_FONT};font-size:14px;color:${BRAND_COLORS.textMuted};${row.emphasis ? 'font-weight:600;color:' + BRAND_COLORS.textStrong : ''}">
            ${escape(row.label)}
          </td>
          <td align="right" style="padding:9px 0;font-family:${EMAIL_FONT};font-size:14px;color:${BRAND_COLORS.textStrong};${row.emphasis ? 'font-weight:700;' : ''}">
            ${escape(row.value)}
          </td>
        </tr>`
    )
    .join('')

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${body}</table>`
}

export { escape as escapeHtml }