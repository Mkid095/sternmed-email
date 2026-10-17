/**
 * HTML sanitisation
 *
 * Inbound email HTML and stored template HTML are attacker-controlled and are
 * injected with dangerouslySetInnerHTML. Sanitising at the render boundary is
 * the last line of defence: everything that reaches the DOM goes through here.
 *
 * The policy is an allowlist (DOMPurify removes anything not named), which is
 * the safe direction — a denylist only catches what someone already thought of.
 */

import DOMPurify from 'dompurify'

/** Tags a legitimate marketing/branded email needs. */
const ALLOWED_TAGS = [
  // Structure
  'div', 'span', 'p', 'br', 'hr', 'section', 'article', 'header', 'footer', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // Tables (invoices, order forms)
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Inline + media
  'a', 'img', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark', 'abbr', 'cite', 'q',
  'blockquote', 'pre', 'code', 'kbd', 'samp', 'pre',
  'figure', 'figcaption', 'picture', 'source',
]

const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel',
  'src', 'alt', 'width', 'height', 'loading',
  'colspan', 'rowspan', 'align', 'valign',
  'style', 'class', 'dir', 'lang',
  'bgcolor', 'cellpadding', 'cellspacing', 'border',
]

/** Only these URL schemes may appear in href/src. Blocks javascript: and data:. */
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i

let hooksInstalled = false

function installHooks() {
  if (hooksInstalled) return
  hooksInstalled = true

  // Links that open a new tab must not hand the opener to the target.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

export interface SanitizeOptions {
  /** Extra tags to permit beyond the default allowlist. */
  allowExtraTags?: string[]
}

/**
 * Sanitise untrusted HTML. Returns a string safe for dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string | null | undefined, options: SanitizeOptions = {}): string {
  if (!html) return ''
  installHooks()

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: options.allowExtraTags
      ? [...ALLOWED_TAGS, ...options.allowExtraTags]
      : ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    // Strip <script>, <style>, <iframe>, <object>, <embed>, <form> etc.
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction', 'srcdoc'],
    // Keep dangerous CSS (expression(), url(javascript:), behaviour) out.
    USE_PROFILES: { html: true, svg: true, svgFilters: false },
  })
}

/**
 * Sanitise for preview contexts where the source is our own templates.
 * Identical policy — templates are editable by staff, so they are not trusted
 * either, but this reads better at the call site than an inline options object.
 */
export function sanitizeTemplateHtml(html: string | null | undefined): string {
  return sanitizeHtml(html)
}

/**
 * Escape a string for safe interpolation into text or a quoted attribute.
 * Use when building HTML rather than sanitising an existing document.
 */
export function escapeHtmlText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Validate a URL before it goes into href/src.
 * Blocks javascript:, data:, vbscript: and other executable schemes.
 */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined

  // Relative URLs and fragments are fine.
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed, 'https://placeholder.invalid')
    const scheme = parsed.protocol.replace(':', '').toLowerCase()
    const allowed = ['http', 'https', 'mailto', 'tel', 'cid']
    return allowed.includes(scheme) ? trimmed : undefined
  } catch {
    return undefined
  }
}