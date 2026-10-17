/**
 * Rich-text editor for the compose body.
 *
 * A minimal contenteditable surface with the formatting a person actually
 * reaches for when writing an email: bold, italic, underline, alignment, lists
 * and links. It is deliberately not a full document editor — the compose view
 * already has a plain-text mode, and the goal here is that selecting a sentence
 * and pressing Ctrl+B does the obvious thing.
 *
 * Why hand-rolled rather than TipTap/ProseMirror/Lexical: the main bundle is
 * already ~680 kB and those libraries would add more than the whole feature is
 * worth. `document.execCommand` is deprecated but is still the only API that
 * gives selection-preserving inline formatting with no dependencies, and it
 * maps cleanly onto the tags an email client understands.
 *
 * Output is sanitised on every emit. The editor is the only place in the app
 * that produces HTML by typing, so this is the last point where a pasted
 * payload could enter the send path.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List as ListIcon,
  ListOrdered,
  Link as LinkIcon,
  Eraser,
} from 'lucide-react'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import { sanitizeHtml } from '../../lib/sanitizeHtml'

export interface RichTextEditorProps {
  /** Current HTML. Treated as the source of truth on external changes. */
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

type FormatState = {
  bold: boolean
  italic: boolean
  underline: boolean
  insertUnorderedList: boolean
  insertOrderedList: boolean
  justifyLeft: boolean
  justifyCenter: boolean
  justifyRight: boolean
}

const EMPTY_FORMAT: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  justifyLeft: true,
  justifyCenter: false,
  justifyRight: false,
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your message…',
  minHeight = 300,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [formats, setFormats] = useState<FormatState>(EMPTY_FORMAT)
  const { colors } = useTheme()

  /**
   * The last HTML this editor emitted.
   *
   * DOMPurify does not return a byte-identical string to innerHTML — it
   * normalises attribute order and entities — so after every keystroke
   * `value !== el.innerHTML` was true. That made the effect below reassign
   * innerHTML on the following render, which destroys the selection. The
   * visible symptom was that clicking Bold (or any format) applied to the
   * whole message instead of the highlighted words, because the highlight was
   * already gone by the time the command ran.
   *
   * Comparing against our own last emission distinguishes "the parent changed
   * this" from "this is just my own output coming back".
   */
  const lastEmitted = useRef<string | null>(null)

  useEffect(() => {
    const el = editorRef.current
    if (!el) return

    // Our own round-trip: the DOM is already correct. Touching it would reset
    // the caret and collapse the selection.
    if (value === lastEmitted.current) return

    if (el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value])

  const refreshFormats = useCallback(() => {
    const el = editorRef.current
    if (!el || document.activeElement !== el) return
    const next: FormatState = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
    }
    // Keep the caret where it is; only mirror state into React.
    setFormats((prev) =>
      Object.keys(next).every((k) => prev[k as keyof FormatState] === next[k as keyof FormatState])
        ? prev
        : next
    )
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', refreshFormats)
    return () => document.removeEventListener('selectionchange', refreshFormats)
  }, [refreshFormats])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const clean = sanitizeHtml(el.innerHTML)
    lastEmitted.current = clean
    onChange(clean)
  }, [onChange])

  /**
   * execCommand mutates the selection in place, which is exactly the
   * behaviour wanted — but it drops focus in some browsers, so focus is
   * restored explicitly before running it.
   */
  const exec = useCallback(
    (command: string, argument?: string) => {
      const el = editorRef.current
      if (!el) return

      // Only steal focus when it is genuinely elsewhere. Calling focus() on the
      // already-focused element can still reset the selection to the start,
      // which is what made formatting apply to the entire document.
      if (document.activeElement !== el) {
        el.focus()
      }

      document.execCommand(command, false, argument)
      emit()
      refreshFormats()
    },
    [emit, refreshFormats]
  )

  const insertLink = useCallback(() => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    const url = window.prompt('Link URL (https://…)')

    // Cancelling must leave the selection and the document untouched.
    if (url === null) return
    const trimmed = url.trim()
    if (!trimmed) return

    // Only well-formed links are worth inserting; the sanitizer would strip a
    // javascript: URL anyway, but failing loudly here is clearer than silently
    // dropping it after the fact.
    if (!/^https?:\/\//i.test(trimmed)) {
      window.alert('Links must start with http:// or https://')
      return
    }

    if (selectedText) {
      exec('createLink', trimmed)
    } else {
      exec('insertHTML', `<a href="${trimmed}" target="_blank" rel="noopener noreferrer">${trimmed}</a>`)
    }
  }, [exec])

  const clearFormatting = useCallback(() => {
    exec('removeFormat')
    exec('unlink')
  }, [exec])

  /**
   * Paste as sanitised HTML rather than raw clipboard content. Without this a
   * pasted page can smuggle styles, classes and tracking pixels into a message.
   */
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault()
      const html = event.clipboardData.getData('text/html')
      const text = event.clipboardData.getData('text/plain')

      if (html) {
        document.execCommand('insertHTML', false, sanitizeHtml(html))
      } else if (text) {
        // Preserve line breaks when pasting plain text.
        document.execCommand(
          'insertText',
          false,
          text.replace(/\r\n/g, '\n').split('\n').join('<br />')
        )
      }
      emit()
      refreshFormats()
    },
    [emit, refreshFormats]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Ctrl/Cmd+B and Ctrl/Cmd+I, because that is what people press.
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key === 'b') {
        event.preventDefault()
        exec('bold')
      } else if (key === 'i') {
        event.preventDefault()
        exec('italic')
      }
    },
    [exec]
  )

  const tools: Array<{
    key: string
    label: string
    icon: React.ReactNode
    active: boolean
    run: () => void
  }> = [
    { key: 'bold', label: 'Bold (Ctrl+B)', icon: <Bold size={15} />, active: formats.bold, run: () => exec('bold') },
    { key: 'italic', label: 'Italic (Ctrl+I)', icon: <Italic size={15} />, active: formats.italic, run: () => exec('italic') },
    { key: 'underline', label: 'Underline', icon: <Underline size={15} />, active: formats.underline, run: () => exec('underline') },
    { key: 'left', label: 'Align left', icon: <AlignLeft size={15} />, active: formats.justifyLeft, run: () => exec('justifyLeft') },
    { key: 'center', label: 'Align centre', icon: <AlignCenter size={15} />, active: formats.justifyCenter, run: () => exec('justifyCenter') },
    { key: 'right', label: 'Align right', icon: <AlignRight size={15} />, active: formats.justifyRight, run: () => exec('justifyRight') },
    { key: 'ul', label: 'Bulleted list', icon: <ListIcon size={15} />, active: formats.insertUnorderedList, run: () => exec('insertUnorderedList') },
    { key: 'ol', label: 'Numbered list', icon: <ListOrdered size={15} />, active: formats.insertOrderedList, run: () => exec('insertOrderedList') },
    { key: 'link', label: 'Insert link', icon: <LinkIcon size={15} />, active: false, run: insertLink },
    { key: 'clear', label: 'Clear formatting', icon: <Eraser size={15} />, active: false, run: clearFormatting },
  ]

  return (
    <div className="flex flex-col min-h-0">
      {/* Toolbar. onMouseDown preventDefault keeps the selection alive —
          clicking a button normally blurs the editor and drops it. */}
      <div
        className="flex items-center gap-0.5 px-3 py-1.5 flex-wrap"
        style={{ borderBottom: `1px solid ${colors.divider}`, backgroundColor: colors.surfaceHover }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {tools.map((tool, index) => (
          <span key={tool.key} className="contents">
            {index === 3 && (
              <span
                className="mx-1.5"
                style={{ width: 1, height: 18, backgroundColor: colors.divider }}
              />
            )}
            {index === 6 && (
              <span
                className="mx-1.5"
                style={{ width: 1, height: 18, backgroundColor: colors.divider }}
              />
            )}
            <button
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={tool.active}
              onClick={tool.run}
              className="grid place-items-center cursor-pointer transition-colors"
              style={{
                width: 30,
                height: 30,
                borderRadius: radius.sm,
                border: 'none',
                backgroundColor: tool.active ? colors.surface : 'transparent',
                color: tool.active ? colors.primary : colors.textSecondary,
                boxShadow: tool.active ? '0 1px 2px rgb(15 23 42 / 0.08)' : 'none',
              }}
            >
              {tool.icon}
            </button>
          </span>
        ))}
      </div>

      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="rich-editor flex-1 outline-none px-4 py-3"
        style={{ minHeight, fontSize: fontSize.md, lineHeight: 1.7, color: colors.textPrimary }}
        onInput={emit}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onBlur={refreshFormats}
      />
    </div>
  )
}