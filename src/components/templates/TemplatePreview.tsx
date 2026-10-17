import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Monitor, Smartphone, RefreshCw } from 'lucide-react'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import { Button, IconButton } from '../ui/Button'
import { escapeHtmlText } from '../../lib/sanitizeHtml'

/**
 * Email template preview
 *
 * Email HTML is a foreign, hostile rendering environment: it carries its own
 * styles, is laid out by the mail client's engine, and cannot rely on anything
 * from the host page. An iframe is therefore the only way to preview it
 * truthfully — injecting it into the app DOM would inherit our styles and
 * misrepresent what the recipient sees.
 *
 * The frame is sandboxed with no allowances, so nothing in the template can
 * execute or navigate the parent.
 */

export interface TemplatePreviewProps {
  /** Raw template HTML, before placeholder substitution. */
  html: string
  /** Placeholder values keyed by placeholder token, e.g. '{{company_name}}'. */
  variables?: Record<string, string>
  /** Force a device width instead of letting the user toggle. */
  width?: number
}

type Viewport = 'desktop' | 'mobile'

const DESKTOP_WIDTH = 700
const MOBILE_WIDTH = 390

export function TemplatePreview({ html, variables = {}, width }: TemplatePreviewProps) {
  const { colors } = useTheme()
  const [viewport, setViewport] = useState<Viewport>('desktop')
  // Bumping this forces the iframe to reload, which is how "Refresh" works.
  const [reloadKey, setReloadKey] = useState(0)

  const resolved = useMemo(() => {
    let output = html || ''
    Object.entries(variables).forEach(([token, value]) => {
      output = output.split(token).join(value ?? '')
    })
    // Surface any placeholder the caller did not supply rather than shipping
    // raw "{{company_phone}}" to a customer.
    output = output.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
      return `[${escapeHtmlText(key.replace(/_/g, ' '))}]`
    })
    return output
  }, [html, variables])

  const effectiveWidth = width ?? (viewport === 'desktop' ? DESKTOP_WIDTH : MOBILE_WIDTH)

  return (
    <div className="flex flex-col min-h-0" style={{ height: '100%' }}>
      {/* Preview toolbar */}
      {!width && (
        <div
          className="flex items-center gap-2 flex-shrink-0"
          style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.divider}` }}
        >
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ backgroundColor: colors.surfaceSubtle }}
            role="group"
            aria-label="Preview width"
          >
            {([
              { key: 'desktop', label: 'Desktop', Icon: Monitor },
              { key: 'mobile', label: 'Mobile', Icon: Smartphone },
            ] as const).map(({ key, label, Icon }) => {
              const active = viewport === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewport(key)}
                  aria-pressed={active}
                  className="flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                  style={{
                    height: 28,
                    padding: '0 10px',
                    borderRadius: radius.sm,
                    fontSize: fontSize.sm,
                    backgroundColor: active ? colors.surface : 'transparent',
                    color: active ? colors.textPrimary : colors.textSecondary,
                    boxShadow: active ? '0 1px 2px rgb(15 23 42 / 0.08)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex-1" />

          <span
            className="tabular"
            style={{ fontSize: fontSize.xs, color: colors.textTertiary }}
          >
            {effectiveWidth}px
          </span>

          <IconButton label="Reload preview" size={30} onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw size={15} />
          </IconButton>
        </div>
      )}

      {/* Canvas */}
      <div
        className="flex-1 overflow-auto flex justify-center min-h-0 scrollbar-thin"
        style={{ backgroundColor: colors.canvas, padding: 20 }}
      >
        <iframe
          key={reloadKey}
          title="Email template preview"
          // srcDoc renders the markup in a fresh document, isolated from app CSS.
          srcDoc={resolved}
          sandbox=""
          className="border-0 rounded-lg"
          style={{
            width: effectiveWidth,
            maxWidth: '100%',
            height: '100%',
            minHeight: 480,
            backgroundColor: '#ffffff',
            boxShadow: colors.shadow,
          }}
        />
      </div>
    </div>
  )
}

export default TemplatePreview