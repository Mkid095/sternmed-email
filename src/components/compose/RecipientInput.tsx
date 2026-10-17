import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'

/** Deliberately permissive: the real check is delivery, not our regex. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export interface RecipientInputProps {
  label: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Marks the whole field invalid — e.g. on a failed send. */
  invalid?: boolean
}

export function RecipientInput({
  label,
  value,
  onChange,
  placeholder = '',
  invalid,
}: RecipientInputProps) {
  const { colors } = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const cleaned = raw.trim().replace(/^<|>$/g, '')
    if (!cleaned) return

    // A pasted "a@b.com, c@d.com" becomes two chips.
    const parts = cleaned
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean)

    const additions = parts.filter((p) => !value.includes(p))
    if (additions.length > 0) onChange([...value, ...additions])
    setDraft('')
  }

  const remove = (target: string) => {
    onChange(value.filter((v) => v !== target))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      commit(draft)
      return
    }

    if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      // Backspace on an empty field removes the last chip, as in Gmail.
      onChange(value.slice(0, -1))
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!/[,;\n]/.test(text)) return // single address — let the input handle it
    e.preventDefault()
    commit(text)
  }

  return (
    <div
      className={clsx('flex items-start gap-3 px-4 py-2.5 transition-colors')}
      style={{
        borderBottom: `1px solid ${invalid ? colors.error : colors.divider}`,
        backgroundColor: invalid ? colors.errorBg : 'transparent',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <label
        className="flex-shrink-0 pt-1 select-none"
        style={{ fontSize: fontSize.base, color: colors.textSecondary, width: 58 }}
      >
        {label}
      </label>

      <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[32px]">
        {value.map((address) => {
          const valid = isValidEmail(address)
          return (
            <span
              key={address}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md"
              style={{
                backgroundColor: valid ? colors.surfaceSubtle : colors.errorBg,
                color: valid ? colors.textPrimary : colors.error,
                fontSize: fontSize.sm,
                maxWidth: '100%',
              }}
            >
              <span className="truncate" title={address}>
                {address}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(address)
                }}
                aria-label={`Remove ${address}`}
                className="flex items-center justify-center rounded cursor-pointer flex-shrink-0"
                style={{ width: 16, height: 16, color: colors.textSecondary }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </span>
          )
        })}

        <input
          ref={inputRef}
          type="text"
          value={draft}
          placeholder={value.length === 0 ? placeholder : ''}
          aria-label={label}
          aria-invalid={invalid}
          autoComplete="off"
          className="flex-1 min-w-[140px] bg-transparent outline-none"
          style={{ fontSize: fontSize.base, color: colors.textPrimary, padding: '4px 0' }}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => commit(draft)}
        />
      </div>
    </div>
  )
}