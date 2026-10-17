/**
 * HTML -> plain text, for the text/plain MIME part.
 *
 * Every email needs a text alternative: clients that block HTML, screen
 * readers, and grep. When the body is written in the rich editor there is no
 * plain-text source any more, so it is derived here at send time.
 *
 * DOMParser is used rather than a regex pass because stripping tags by pattern
 * turns `a < b` into `a ` and leaves entity references behind.
 */

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''

  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Block-level elements become real newlines before text is collected,
  // otherwise every paragraph runs together on one line.
  doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  doc
    .querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, blockquote, tr')
    .forEach((el) => el.append('\n'))

  // Link targets are worth keeping; the display text alone loses the URL.
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    if (href && !href.startsWith('javascript:')) {
      a.append(` (${href})`)
    }
  })

  const text = doc.body.textContent ?? ''

  return text
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}