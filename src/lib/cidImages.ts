/**
 * Content-ID (cid:) inline image resolution
 *
 * Email marks up inline images with `src="cid:image006.jpg@01DCF987…"`. The
 * actual bytes live in a MIME part attached to the same message, and only the
 * receiving client can map the reference. A browser cannot resolve the scheme
 * at all — it logs ERR_UNKNOWN_URL_SCHEME for every one and renders a broken
 * placeholder.
 *
 * Two things to do:
 *   1. Where the matching attachment was stored, point the src at its real URL
 *      so the image renders.
 *   2. Where it was not, drop the src so the browser stops making a request
 *      that can only ever fail.
 */

export interface CidableAttachment {
  filename: string
  url?: string
  /**
   * MIME Content-ID of the part, stored by the inbound worker with the angle
   * brackets stripped. This is the ONLY reliable join between a `cid:` in the
   * body and the stored file.
   */
  contentId?: string
}

/** `cid:image006.jpg@01DCF987.0D40BD40` -> `image006.jpg` */
function cidToFilename(cid: string): string {
  return cid
    .replace(/^cid:/i, '')
    .split('@')[0]
    .trim()
    .toLowerCase()
}

/** Reduce a stored contentId to the same bare token a cid: reference carries. */
function normaliseContentId(value: string): string {
  return value
    .replace(/^cid:/i, '')
    .replace(/^<|>$/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Match a cid reference to its stored attachment.
 *
 * The Content-ID is the correct key and is tried first. Matching on filename
 * alone — which is what this used to do — can never work in practice: senders
 * name inline parts anything they like (`icon.png`) while the Content-ID is an
 * unrelated machine token (`f_mvc6vtdg0`). The filename comparison is kept only
 * as a fallback for rows stored before the worker began persisting contentId.
 */
function findAttachment(cid: string, attachments: CidableAttachment[]): CidableAttachment | undefined {
  const token = cidToFilename(cid)
  if (!token) return undefined

  // A cid: reference may carry the full "id@host" form while the stored
  // contentId keeps it whole, so compare both the full token and the bare part.
  const bare = normaliseContentId(cid).split('@')[0]

  const byContentId = attachments.find((attachment) => {
    if (!attachment.contentId) return false
    const stored = normaliseContentId(attachment.contentId)
    return stored === token || stored === bare || stored.split('@')[0] === bare
  })
  if (byContentId) return byContentId

  return attachments.find((attachment) => {
    const candidate = attachment.filename.toLowerCase()
    if (candidate === token) return true
    const withoutExtension = candidate.replace(/\.[^.]+$/, '')
    return withoutExtension === token || token.replace(/\.[^.]+$/, '') === withoutExtension
  })
}

/**
 * Return `html` with cid: image sources resolved, or stripped when the
 * referenced part was never stored.
 */
export function resolveCidImages(
  html: string | null | undefined,
  attachments: CidableAttachment[]
): string {
  if (!html || !html.includes('cid:')) return html ?? ''

  const hasAttachments = attachments.length > 0

  return html.replace(
    /(<img\b[^>]*?\bsrc\s*=\s*)(["'])cid:([^"']+)\2/gi,
    (match, prefix, quote, cid) => {
      const attachment = hasAttachments ? findAttachment(cid, attachments) : undefined

      if (attachment?.url) {
        return `${prefix}${quote}${attachment.url}${quote}`
      }

      // Drop the attribute. The alt text (if any) still shows, and no doomed
      // request is issued.
      return match.replace(`${prefix}${quote}cid:${cid}${quote}`, `${prefix}${quote}${quote}`)
    }
  )
}

/** True when the body still contains unresolved cid: references. */
export function hasUnresolvedCidImages(html: string | null | undefined): boolean {
  return !!html && /<img\b[^>]*\bsrc\s*=\s*["']cid:/i.test(html)
}