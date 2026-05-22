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
  }>
  messageId?: string
  inReplyTo?: string
  references?: string
  spfPass: boolean
  dkimPass: boolean
  isRead: boolean
  isStarred: boolean
  deletedAt?: string
  receivedAt: string
  createdAt: string
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