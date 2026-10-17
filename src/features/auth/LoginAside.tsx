/**
 * The left-hand panel of the sign-in screen.
 *
 * Deliberately sparse. An earlier version carried a five-item capability list
 * — Archive/Spam/Trash, attachment previews, branded templates, SPF reporting —
 * which turned the sign-in page into a brochure. A login screen is not the
 * place to sell; it is the place to confirm you are in the right place.
 *
 * The logo sits on a white plate rather than directly on the navy panel. The
 * asset is dark-on-transparent (see BRAND_LOGO.placeOnLightBackground), so it
 * has no contrast on navy — inverting it to white was fighting the brand
 * constraint and made the lockup read as cramped and mis-scaled.
 *
 * Hidden below `lg`: on a phone the form is the only thing that matters.
 */

import { BRAND_LOGO, COMPANY } from '../../config/brand'

export function LoginAside() {
  return (
    <aside
      // Its own scroll area, and generous vertical padding so the content
      // never touches the top or bottom edge on a short viewport.
      className="hidden lg:flex flex-col justify-center overflow-y-auto px-14 xl:px-20 py-16 lg:w-[46%] xl:w-[48%] lg:flex-none"
      style={{
        background: 'linear-gradient(165deg, #17487a 0%, #123a62 60%, #0d2a48 100%)',
      }}
    >
      <div className="flex flex-col items-start gap-10">
        {/* Logo on white — its only legible ground. */}
        <div
          className="flex items-center"
          style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: '20px 28px' }}
        >
          <img
            src={BRAND_LOGO.url}
            alt={BRAND_LOGO.alt}
            style={{ width: 168, height: 'auto', display: 'block' }}
          />
        </div>

        <div>
          <p
            className="font-semibold leading-tight"
            style={{ fontSize: 30, letterSpacing: '-0.02em', color: '#ffffff' }}
          >
            {COMPANY.domain}
          </p>
          <p
            className="mt-3"
            style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.70)', maxWidth: '30ch' }}
          >
            Mail for {COMPANY.legalName.replace(/\.$/, '')}.
          </p>
        </div>
      </div>

      <div className="mt-14" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.50)' }}>
        Trouble signing in?{' '}
        <a
          href={`mailto:${COMPANY.supportEmail}`}
          style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}
        >
          {COMPANY.supportEmail}
        </a>
      </div>
    </aside>
  )
}