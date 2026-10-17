import { useMemo, type CSSProperties } from 'react'
import { sanitizeHtml } from '../../lib/sanitizeHtml'

export interface SafeHtmlProps {
  /** Untrusted HTML — typically an email body or a stored template. */
  html: string | null | undefined
  className?: string
  style?: CSSProperties
}

/**
 * Renders untrusted HTML through an allowlist sanitizer.
 *
 * Use this instead of dangerouslySetInnerHTML for any content that came from
 * an email, a template record, or any other user-influenced source.
 *
 * Memoised because sanitising runs on every render otherwise, and email
 * bodies are often large.
 */
export function SafeHtml({ html, className, style }: SafeHtmlProps) {
  const clean = useMemo(() => sanitizeHtml(html), [html])

  if (!clean) return null

  return (
    <div
      className={className}
      style={style}
      // Safe: `clean` is the output of DOMPurify with an allowlist policy.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}

export default SafeHtml