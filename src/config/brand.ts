/**
 * Brand configuration
 *
 * Single source of truth for every brand and contact value that appears in an
 * outgoing email. Previously these were duplicated across five template files
 * and two services, which is how "P.O. Box [Your P.O. Box]" and
 * "+254 700 000 000" ended up going out to customers.
 *
 * ── BEFORE SHIPPING ──────────────────────────────────────────────
 * Two values below are still placeholders and MUST be replaced with the
 * client's real details. They are flagged with `TODO(client)`.
 *
 * Anything unverified should be removed from the templates rather than sent.
 */

/** Primary brand navy. Matches the palette already used by every template. */
export const BRAND_COLORS = {
  primary: '#17487a',
  primaryDark: '#123a62',
  primarySoft: '#e8f0f7',
  accent: '#f59e0b',
  accentSoft: '#fef3c7',
  accentText: '#92400e',

  textBody: '#374151',
  textMuted: '#64748b',
  textStrong: '#1f2937',
  link: '#0284c7',

  border: '#e5e7eb',
  panelBg: '#f9fafb',
  footerBg: '#f8fafc',
  pageBg: '#f3f4f6',

  success: '#16a34a',
  danger: '#dc2626',
} as const

/**
 * Logo.
 *
 * Must be an absolute https URL. Gmail and Outlook both refuse data-URI and
 * relative image sources, so a bundled asset would render as a broken image.
 * Only a dark-on-transparent PNG exists today — see the note below.
 */
export const BRAND_LOGO = {
  url: 'https://res.cloudinary.com/dxb22swfg/image/upload/v1765747561/Asset_4_v5ksi6.png',
  /** Intrinsic width of the lockup, used to keep the aspect ratio. */
  width: 200,
  alt: 'Sternmed Afrika',
  /**
   * The logo is dark-on-transparent, so it must sit on a light background.
   * A reverse/white variant has been requested; until it exists, keep every
   * logo placement on white or a pale panel — never on the navy header.
   */
  placeOnLightBackground: true,
} as const

export const COMPANY = {
  legalName: 'Sternmed Afrika Ltd.',
  brandName: 'Sternmed Afrika',
  tagline: 'Your trusted partner in medical consumables and equipment across Africa.',
  website: 'https://sternmedafrika.com',
  domain: 'sternmedafrika.com',
  /**
   * Sits on a pale surface only — see BRAND_LOGO.placeOnLightBackground.
   */
  supportEmail: 'info@sternmedafrika.com',
  /**
   * TODO(client): confirm this number. It is the only non-placeholder Kenyan
   * number found in the repo; every other occurrence is "+254 700 000 000".
   */
  phone: '+254 799 526 972',
  phoneDigits: '254799526972',
  /**
   * TODO(client): no P.O. Box or street address exists anywhere in the repo.
   * Replace before sending any customer-facing email — shipping the literal
   * placeholder text is worse than omitting the line.
   */
  addressLine1: 'Nairobi, Kenya',
  addressLine2: '',
  /**
   * TODO(client): this block appears in only one template and has never been
   * confirmed. Remove it if it is not accurate.
   */
  businessHours: 'Mon – Fri: 8:00 AM – 6:00 PM · Sat: 9:00 AM – 2:00 PM',
} as const

/** Commercial defaults used by quote and order templates. */
export const COMMERCIAL = {
  currency: 'Ksh',
  locale: 'en-KE',
  vatRate: 16,
  quoteValidityDays: 30,
  deliveryNairobi: '3–7 business days',
  paymentTerms: '50% deposit to confirm the order, balance payable on delivery.',
  warranty: 'Manufacturer warranty applies to all supplied equipment.',
} as const

/**
 * No social accounts exist on the website or anywhere in the repos. Rather
 * than render dead links, templates omit the social row entirely.
 */
export const SOCIAL_LINKS: Array<{ label: string; url: string }> = []

/*
 * VALUE_PROPS was removed deliberately.
 *
 * It existed so templates could append a "Why clients choose us" block. That
 * put marketing claims into every message the mailbox sent — including one-line
 * replies — which is not the sender's voice and is not something they can
 * review before hitting send. Templates are now a frame around the sender's own
 * text. If branded marketing copy is ever wanted again, it belongs on a landing
 * page, not in an inbox.
 */

/**
 * Flagged placeholders. A guard below lets the UI warn before someone sends a
 * template that still contains one.
 */
export const BRAND_PLACEHOLDERS = [
  '[Your P.O. Box]',
  '[XXXX',
  '+254 700 000 000',
  'TODO',
] as const

/** True when any of the known placeholder markers is still present. */
export function hasBrandPlaceholder(html: string): boolean {
  return BRAND_PLACEHOLDERS.some((marker) => html.includes(marker))
}