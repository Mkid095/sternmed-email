export interface EmailAlias {
  id: string
  alias_email: string
  display_name: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface EmailInbound {
  id: string
  threadId: string
  aliasId: string
  senderEmail: string
  senderName?: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
  attachments: Array<{
    id: string
    filename: string
    contentType: string
    size: number
    storagePath: string
    /** MIME Content-ID for inline parts, used to resolve `cid:` references. */
    contentId?: string
    /** Resolved delivery URL, derived from storagePath. */
    url?: string
  }>
  messageId?: string
  inReplyTo?: string
  references?: string
  /** null means the sender sent no Authentication-Results header: genuinely unknown, not a pass. */
  spfPass: boolean | null
  dkimPass: boolean | null
  isRead: boolean
  isStarred: boolean
  /** Set when the message was moved to Archive. */
  archivedAt?: string
  /** True when reported as spam. */
  isSpam: boolean
  /** Set when moved to Trash. */
  deletedAt?: string
  receivedAt: string
  createdAt: string
}

/** Where a message currently sits. */
export type MailboxFolder = 'inbox' | 'archive' | 'spam' | 'trash'

/** Counts shown on the sidebar. */
export interface FolderCounts {
  inbox: number
  archive: number
  spam: number
  trash: number
}

export interface EmailOutbound {
  id: string
  aliasId: string
  recipientEmail: string
  cc?: string[]
  bcc?: string[]
  subject: string
  bodyHtml?: string
  bodyText?: string
  templateId?: string
  attachments: Array<{
    filename: string
    url: string
    type: string
    size: number
  }>
  status: 'pending' | 'sent' | 'failed'
  externalMessageId?: string
  errorMessage?: string
  sentAt?: string
  retryCount: number
  maxRetries: number
  /** Set when the sent message was moved to Archive. */
  archivedAt?: string
  deletedAt?: string
  updatedAt?: string
  createdAt: string
}

export interface EmailDraft {
  id: string
  aliasId: string
  recipientEmail: string
  cc: string[]
  bcc: string[]
  subject: string
  bodyHtml?: string
  bodyText?: string
  attachments: Array<{
    id: string
    filename: string
    size: number
    contentType: string
  }>
  lastAutoSavedAt: string
  updatedAt: string
  createdAt: string
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
  hasMore: boolean
}