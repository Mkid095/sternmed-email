/**
 * Attachment rendering for the message reader.
 *
 * Split out of MessageView because the reader was approaching the 800-line
 * maintainability ceiling and this is a self-contained concern.
 *
 * Three rendering strategies, because one does not fit all:
 *
 *   images  — a thumbnail strip, clicking opens a full-size lightbox. Email
 *             images are usually small and sitting side by side beats a list.
 *   pdfs    — an inline preview frame, because reading an invoice without
 *             leaving the message is the whole point of a mail client.
 *   other   — a download row. There is no safe generic preview.
 *
 * Note the CSP in vercel.json: `object-src 'none'` rules out <object>/<embed>,
 * so the PDF preview must be an <iframe> and `frame-src` has to allow
 * res.cloudinary.com. Both are set there.
 */

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Paperclip,
  Download,
  FileText,
  ImageIcon,
  Archive,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import type { EmailInbound } from '../../types'

type Attachment = EmailInbound['attachments'][number]

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Cloudinary serves PDFs with content-disposition inline, so a plain link previews. */
function isPdf(attachment: Attachment): boolean {
  return attachment.contentType === 'application/pdf' || /\.pdf$/i.test(attachment.filename)
}

function isImage(attachment: Attachment): boolean {
  return attachment.contentType?.startsWith('image/') ?? false
}

/** Filename for the saved file. Cloudinary's own name is a random public_id. */
function downloadName(attachment: Attachment): string {
  return attachment.filename || 'attachment'
}

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  const { colors } = useTheme()
  const [preview, setPreview] = useState<Attachment | null>(null)
  /**
   * Collapsed PDF ids. An inline preview is a 460px iframe and a message can
   * carry several attachments, so letting the reader fold them away matters.
   * Default is expanded, matching mail clients where previewing is the point.
   */
  const [collapsedPdfs, setCollapsedPdfs] = useState<Set<string>>(new Set())

  if (!attachments || attachments.length === 0) return null

  const images = attachments.filter(isImage)
  const pdfs = attachments.filter(isPdf)
  const others = attachments.filter((a) => !isImage(a) && !isPdf(a))

  return (
    <section className="mt-8 pt-6" style={{ borderTop: `1px solid ${colors.divider}` }}>
      <div className="flex items-center gap-2 mb-4">
        <Paperclip size={15} style={{ color: colors.textTertiary }} />
        <h2 style={{ fontSize: fontSize.base, fontWeight: 600, color: colors.textPrimary }}>
          {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
        </h2>
      </div>

      <div className="flex flex-col gap-5">
        {/* ── Images ─────────────────────────────────────────────── */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((attachment) => (
              <button
                key={attachment.id}
                type="button"
                onClick={() => setPreview(attachment)}
                aria-label={`View ${attachment.filename}`}
                className="group relative overflow-hidden cursor-pointer transition-all"
                style={{
                  width: 132,
                  height: 100,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surfaceSubtle,
                  padding: 0,
                }}
              >
                <img
                  src={attachment.url}
                  // The filename is already visible in the overlay below, so
                  // an alt text of the same value makes screen readers
                  // announce it twice. Decorative alt.
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                  onError={(e) => {
                    // A broken thumbnail is worse than an honest placeholder.
                    const img = e.currentTarget
                    img.style.display = 'none'
                    img.parentElement?.setAttribute('data-broken', 'true')
                  }}
                />
                <span
                  className="absolute bottom-0 left-0 right-0 px-2 py-1 text-left truncate"
                  style={{
                    fontSize: fontSize.xs,
                    color: '#ffffff',
                    background: 'linear-gradient(to top, rgb(0 0 0 / 0.72), transparent)',
                  }}
                >
                  {attachment.filename}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── PDFs ────────────────────────────────────────────────── */}
        {pdfs.map((attachment) => {
          const isCollapsed = collapsedPdfs.has(attachment.id)

          return (
            <div
              key={attachment.id}
              className="overflow-hidden"
              style={{
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <div
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{
                  borderBottom: isCollapsed ? 'none' : `1px solid ${colors.border}`,
                }}
              >
                <FileText size={16} style={{ color: colors.error, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate"
                    style={{ fontSize: fontSize.sm, color: colors.textPrimary }}
                    title={attachment.filename}
                  >
                    {attachment.filename}
                  </div>
                  <div
                    className="tabular"
                    style={{ fontSize: fontSize.xs, color: colors.textTertiary }}
                  >
                    {formatFileSize(attachment.size)}
                    {isCollapsed ? ' · preview hidden' : ''}
                  </div>
                </div>
                <AttachmentActions attachment={attachment} />
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedPdfs((prev) => {
                      const next = new Set(prev)
                      if (next.has(attachment.id)) next.delete(attachment.id)
                      else next.add(attachment.id)
                      return next
                    })
                  }
                  aria-expanded={!isCollapsed}
                  aria-controls={`preview-${attachment.id}`}
                  aria-label={isCollapsed ? 'Show preview' : 'Hide preview'}
                  title={isCollapsed ? 'Show preview' : 'Hide preview'}
                  className="cursor-pointer"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: radius.sm,
                    border: 'none',
                    background: 'transparent',
                    color: colors.textSecondary,
                    flexShrink: 0,
                  }}
                >
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>

              {!isCollapsed && (
                <iframe
                  id={`preview-${attachment.id}`}
                  src={attachment.url}
                  title={`Preview of ${attachment.filename}`}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: 460,
                    border: 'none',
                    display: 'block',
                    backgroundColor: '#ffffff',
                  }}
                />
              )}
            </div>
          )
        })}

        {/* ── Everything else ────────────────────────────────────── */}
        {others.length > 0 && (
          <div className="flex flex-col gap-2">
            {others.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: colors.surfaceSubtle,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <AttachmentIcon attachment={attachment} />
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate"
                    style={{ fontSize: fontSize.sm, color: colors.textPrimary }}
                    title={attachment.filename}
                  >
                    {attachment.filename}
                  </div>
                  <div className="tabular" style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
                    {attachment.contentType || 'Unknown type'} · {formatFileSize(attachment.size)}
                  </div>
                </div>
                <AttachmentActions attachment={attachment} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Full-size image lightbox ──────────────────────────────── */}
      <Dialog.Root open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <Dialog.Portal>
          {/* z-index is deliberately far above the app chrome (topbar/sidebar
              sit around 50). At equal z-index the portal still wins on DOM
              order, but anything higher in the app would punch through the
              dimming, which reads as a broken overlay. */}
          <Dialog.Overlay
            style={{ backgroundColor: 'rgb(15 23 42 / 0.78)', position: 'fixed', inset: 0, zIndex: 9998 }}
          />
          <Dialog.Content
            style={{
              position: 'fixed',
              inset: '4vh 4vw',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              outline: 'none',
            }}
          >
            <Dialog.Title className="sr-only">{preview?.filename}</Dialog.Title>
            <div className="flex items-center gap-3">
              <span
                // Radix already names the dialog from <Dialog.Title>, so this
                // visible copy is decorative for assistive tech — otherwise it
                // is announced a second time.
                aria-hidden="true"
                className="flex-1 truncate"
                style={{ fontSize: fontSize.sm, color: '#ffffff' }}
              >
                {preview?.filename}
              </span>
              {preview && <AttachmentActions attachment={preview} onDark />}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close preview"
                  className="cursor-pointer"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    backgroundColor: 'rgb(255 255 255 / 0.12)',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            {preview && (
              <div
                className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
                style={{ borderRadius: radius.md }}
              >
                <img
                  src={preview.url}
                  alt={preview.filename}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function AttachmentIcon({ attachment }: { attachment: Attachment }) {
  const { colors } = useTheme()
  if (isImage(attachment)) {
    return <ImageIcon size={16} style={{ color: colors.primary, flexShrink: 0 }} />
  }
  if (isPdf(attachment)) {
    return <FileText size={16} style={{ color: colors.error, flexShrink: 0 }} />
  }
  return <Archive size={16} style={{ color: colors.textSecondary, flexShrink: 0 }} />
}

/**
 * Open + download controls.
 *
 * `download` only has an effect for same-origin resources, and these are
 * cross-origin Cloudinary URLs, so the attribute is a hint the browser may
 * ignore. The Open link is the reliable path; the download attribute is kept
 * because browsers do honour it when the server sends
 * Content-Disposition: attachment.
 */
function AttachmentActions({
  attachment,
  onDark = false,
}: {
  attachment: Attachment
  onDark?: boolean
}) {
  const { colors } = useTheme()
  const href = attachment.url
  if (!href) return null

  const tint = onDark ? '#ffffff' : colors.textSecondary

  return (
    <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${attachment.filename} in a new tab`}
        title="Open in new tab"
        style={{ color: tint, display: 'grid', placeItems: 'center', width: 30, height: 30 }}
      >
        <ExternalLink size={15} />
      </a>
      <a
        href={href}
        download={downloadName(attachment)}
        aria-label={`Download ${attachment.filename}`}
        title="Download"
        style={{ color: tint, display: 'grid', placeItems: 'center', width: 30, height: 30 }}
      >
        <Download size={15} />
      </a>
    </div>
  )
}