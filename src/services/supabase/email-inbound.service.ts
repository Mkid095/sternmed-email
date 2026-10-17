/**
 * Email Inbound Service
 *
 * Manages received emails for email aliases.
 * Supports pagination, threading, search, and filtering.
 *
 * @module services/email-inbound
 */

import { supabase } from '../../config/supabase';
import { EmailInbound, MailboxFolder, FolderCounts } from '../../types';
import { cloudinaryConfig } from '../../config/cloudinary'
import { resolveCidImages } from '../../lib/cidImages';

/**
 * Generate a download URL for an attachment stored in Cloudinary.
 * The storagePath is stored as the Cloudinary public_id.
 * Constructs URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{public_id}
 */
function getAttachmentDownloadUrl(
  storagePath: string,
  contentType?: string
): string {
  if (!storagePath) return '';

  // If it's already a full URL, return as-is
  if (storagePath.startsWith('http')) {
    return storagePath;
  }

  // Determine Cloudinary resource type based on content type
  let resourceType = 'raw';
  if (contentType) {
    if (contentType.startsWith('image/')) {
      resourceType = 'image';
    } else if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      resourceType = 'video';
    }
    // PDF, documents, etc. remain 'raw'
  }

  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/${resourceType}/upload/${storagePath}`;
}

/**
 * Attachment as stored in the `attachments` jsonb column.
 *
 * `contentId` and `url` are optional: rows written before the inbound worker
 * began persisting Content-IDs have no contentId, and `url` is derived here.
 */
export interface StoredAttachmentRow {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  storagePath: string;
  contentId?: string;
}

/** An attachment enriched with its resolved Cloudinary delivery URL. */
export type DownloadableAttachment = StoredAttachmentRow & { url: string };

/**
 * Transform attachment data to include download URL
 */
function transformAttachmentWithUrl(attachment: StoredAttachmentRow): DownloadableAttachment {
  const url = getAttachmentDownloadUrl(attachment.storagePath, attachment.contentType);
  return { ...attachment, url };
}

/**
 * Transform attachments array to include download URLs
 */
function transformAttachmentsWithUrls(attachments: StoredAttachmentRow[]): DownloadableAttachment[] {
  return attachments.map(att => transformAttachmentWithUrl(att));
}

/**
 * Database row type for email_inbound table
 */
interface EmailInboundRow {
  id: string;
  thread_id: string;
  alias_id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  attachments: unknown;
  message_id: string | null;
  in_reply_to: string | null;
  references: string | null;
  spf_pass: boolean;
  dkim_pass: boolean;
  is_read: boolean;
  is_starred: boolean;
  archived_at?: string | null;
  is_spam?: boolean | null;
  deleted_at: string | null;
  received_at: string;
  created_at: string;
}

/**
 * Transform database row to application type
 */
function transformInboundRow(row: EmailInboundRow): EmailInbound {
  return {
    id: row.id,
    threadId: row.thread_id,
    aliasId: row.alias_id,
    senderEmail: row.sender_email,
    senderName: row.sender_name ?? undefined,
    subject: row.subject ?? undefined,
    bodyHtml: row.body_html ?? undefined,
    bodyText: row.body_text ?? undefined,
    attachments: (row.attachments as StoredAttachmentRow[]) ?? [],
    messageId: row.message_id ?? undefined,
    inReplyTo: row.in_reply_to ?? undefined,
    references: row.references ?? undefined,
    spfPass: row.spf_pass,
    dkimPass: row.dkim_pass,
    isRead: row.is_read,
    isStarred: row.is_starred,
    archivedAt: row.archived_at ?? undefined,
    isSpam: row.is_spam ?? false,
    deletedAt: row.deleted_at ?? undefined,
    receivedAt: row.received_at,
    createdAt: row.created_at,
  };
}

/**
 * Enrich email attachments with download URLs
 */
function enrichEmailAttachmentsWithUrls(email: EmailInbound): EmailInbound {
  const attachments = email.attachments ?? [];
  const enrichedAttachments = transformAttachmentsWithUrls(attachments);

  // Depends on the URLs above: a cid: source is rewritten to the attachment's
  // real URL when we have one, and dropped otherwise so the browser stops
  // issuing requests that can only fail.
  const bodyHtml = resolveCidImages(email.bodyHtml, enrichedAttachments);

  return { ...email, attachments: enrichedAttachments, bodyHtml };
}

/**
 * Escape a user-supplied search term for safe use inside a PostgREST
 * `.or()` filter.
 *
 * PostgREST parses commas and parentheses as boolean operators, so an
 * unescaped query could inject extra conditions into the filter. Backslashes
 * and the operator characters must be neutralised. `%` and `_` are LIKE
 * wildcards — we escape them so a query cannot trigger a full-table scan.
 */
function escapePostgrestSearch(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/[%_]/g, (char) => `\\${char}`)
    .replace(/[,()]/g, (char) => `\\${char}`)
}

/**
 * Pagination result type
 */
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

/**
 * Whether the archive/spam columns exist yet.
 *
 * They arrive with migration 20260502_add_archive_spam_trash.sql. Until that
 * is applied, querying them returns "column does not exist" and takes the
 * inbox down with it — including the parts that worked before. So the first
 * such failure flips this flag and the query is retried in legacy mode.
 * Trash keeps working throughout, because deleted_at predates this work.
 */
let folderColumnsAvailable = true

/** Recognises the PostgREST "column does not exist" family of errors. */
function isMissingColumnError(message: string): boolean {
  return /does not exist/i.test(message) && /(archived_at|is_spam)/i.test(message)
}

/** Exposed so the UI can explain why a folder is unavailable. */
export function areFolderColumnsAvailable(): boolean {
  return folderColumnsAvailable
}

/**
 * Email inbound service
 */
export const emailInboundService = {
  /**
   * Get inbound emails for an alias, scoped to a folder.
   *
   * The folder is not a column — it is a combination of three, and each folder
   * filters differently:
   *   inbox    deleted_at IS NULL AND archived_at IS NULL AND is_spam = false
   *   archive  deleted_at IS NULL AND archived_at IS NOT NULL
   *   spam     deleted_at IS NULL AND is_spam = true
   *   trash    deleted_at IS NOT NULL
   */
  async getInboundEmails(
    aliasId: string,
    options: {
      page?: number;
      pageSize?: number;
      unreadOnly?: boolean;
      starredOnly?: boolean;
      threadId?: string;
      folder?: MailboxFolder;
    } = {}
  ): Promise<PaginatedResult<EmailInbound>> {
    const {
      page = 1,
      pageSize = 20,
      unreadOnly = false,
      starredOnly = false,
      threadId,
      folder = 'inbox',
    } = options;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const runQuery = async (useFolderColumns: boolean) => {
      let query = supabase
        .from('email_inbound')
        .select('*', { count: 'exact' })
        .eq('alias_id', aliasId);

      switch (folder) {
        case 'trash':
          // Always available: deleted_at is the original soft-delete column.
          query = query.not('deleted_at', 'is', null);
          break;

        case 'archive':
          if (!useFolderColumns) return null;
          query = query.is('deleted_at', null).not('archived_at', 'is', null);
          break;

        case 'spam':
          if (!useFolderColumns) return null;
          query = query.is('deleted_at', null).eq('is_spam', true);
          break;

        case 'inbox':
        default:
          query = query.is('deleted_at', null);
          if (useFolderColumns) {
            query = query.is('archived_at', null).eq('is_spam', false);
          }
          break;
      }

      if (unreadOnly) query = query.eq('is_read', false);
      if (starredOnly) query = query.eq('is_starred', true);
      if (threadId) query = query.eq('thread_id', threadId);

      return query.order('received_at', { ascending: false }).range(from, to);
    };

    // A folder that needs the new columns, before they exist.
    if ((folder === 'archive' || folder === 'spam') && !folderColumnsAvailable) {
      return { data: [], count: 0, hasMore: false };
    }

    let result = await runQuery(folderColumnsAvailable);

    // First failure against a pre-migration database: fall back and remember.
    // Deliberately not gated on the flag: two callers can be in flight at
    // once (React StrictMode double-invokes effects), and whichever loses the
    // race would otherwise throw instead of falling back.
    if (result?.error && isMissingColumnError(result.error.message)) {
      console.warn(
        '[mailbox] Archive/Spam columns are missing. Apply ' +
          'supabase/migrations/20260502_add_archive_spam_trash.sql. ' +
          'Falling back to Inbox and Trash only.'
      );
      folderColumnsAvailable = false;

      if (folder === 'archive' || folder === 'spam') {
        return { data: [], count: 0, hasMore: false };
      }
      result = await runQuery(false);
    }

    if (!result) {
      return { data: [], count: 0, hasMore: false };
    }

    const { data, error, count } = result;

    if (error) throw new Error(`Failed to fetch inbound emails: ${error.message}`);

    const emails = (data as EmailInboundRow[]).map(transformInboundRow);
    // Enrich all emails with attachment download URLs
    const enrichedEmails = emails.map(enrichEmailAttachmentsWithUrls);

    return {
      data: enrichedEmails,
      count: count ?? 0,
      hasMore: count !== null && from + pageSize < count,
    };
  },

  /**
   * Move a message to Archive, or bring it back to the inbox.
   * Reading `archived_at` rather than toggling means the caller states the
   * destination instead of the action, so it cannot get out of step.
   */
  async setArchived(ids: string | string[], archived: boolean): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 0) return;

    // Nothing sensible to do without the column — say why rather than
    // pretending the message moved.
    if (!folderColumnsAvailable) {
      throw new Error(
        'Archive is not enabled yet. Apply migration 20260502_add_archive_spam_trash.sql.'
      );
    }

    const { error } = await supabase
      .from('email_inbound')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .in('id', list);

    if (error) throw new Error(`Failed to archive: ${error.message}`);
  },

  /** Report as spam, or move back to the inbox. */
  async setSpam(ids: string | string[], spam: boolean): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 0) return;

    if (!folderColumnsAvailable) {
      throw new Error(
        'Spam filtering is not enabled yet. Apply migration 20260502_add_archive_spam_trash.sql.'
      );
    }

    const { error } = await supabase
      .from('email_inbound')
      // Clearing spam returns the message to the inbox, so archive is reset.
      .update({ is_spam: spam, archived_at: spam ? new Date().toISOString() : null })
      .in('id', list);

    if (error) throw new Error(`Failed to update spam: ${error.message}`);
  },

  /**
   * Restore messages from Trash.
   * Reading `deleted_at` rather than toggling, for the same reason.
   */
  async setDeleted(ids: string | string[], deleted: boolean): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 0) return;

    const { error } = await supabase
      .from('email_inbound')
      .update({ deleted_at: deleted ? new Date().toISOString() : null })
      .in('id', list);

    if (error) throw new Error(`Failed to update: ${error.message}`);
  },

  /** Permanently delete messages. Irreversible — used by "Empty trash". */
  async permanentlyDelete(ids: string | string[]): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 0) return;

    const { error } = await supabase
      .from('email_inbound')
      .delete()
      .in('id', list);

    if (error) throw new Error(`Failed to delete permanently: ${error.message}`);
  },

  /**
   * Unread-inbox / archive / spam / trash counts in a single round trip.
   * Falls back to independent counts if the SQL function is not installed yet,
   * so the sidebar still works before the migration is applied.
   */
  async getFolderCounts(aliasId: string): Promise<FolderCounts> {
    const empty: FolderCounts = { inbox: 0, archive: 0, spam: 0, trash: 0 }

    try {
      const { data, error } = await supabase.rpc('get_mailbox_folder_counts', {
        p_alias_id: aliasId,
      })

      if (!error && data && data.length > 0) {
        const row = data[0] as {
          inbox_count?: number
          archived_count?: number
          spam_count?: number
          trash_count?: number
        }
        return {
          inbox: Number(row.inbox_count ?? 0),
          archive: Number(row.archived_count ?? 0),
          spam: Number(row.spam_count ?? 0),
          trash: Number(row.trash_count ?? 0),
        }
      }
    } catch {
      // Function not installed — fall through to the per-folder counts.
    }

    try {
      // Trash only needs deleted_at, so it is always safe to ask for.
      const trashQuery = await supabase
        .from('email_inbound')
        .select('id', { count: 'exact', head: true })
        .eq('alias_id', aliasId)
        .not('deleted_at', 'is', null)
      const trash = trashQuery.count ?? 0

      if (!folderColumnsAvailable) {
        const inboxQuery = await supabase
          .from('email_inbound')
          .select('id', { count: 'exact', head: true })
          .eq('alias_id', aliasId)
          .is('deleted_at', null)
          .eq('is_read', false)

        return { inbox: inboxQuery.count ?? 0, archive: 0, spam: 0, trash }
      }

      const [inboxQ, archiveQ, spamQ] = await Promise.all([
        supabase
          .from('email_inbound')
          .select('id', { count: 'exact', head: true })
          .eq('alias_id', aliasId)
          .is('deleted_at', null)
          .is('archived_at', null)
          .eq('is_spam', false)
          .eq('is_read', false),
        supabase
          .from('email_inbound')
          .select('id', { count: 'exact', head: true })
          .eq('alias_id', aliasId)
          .is('deleted_at', null)
          .not('archived_at', 'is', null),
        supabase
          .from('email_inbound')
          .select('id', { count: 'exact', head: true })
          .eq('alias_id', aliasId)
          .is('deleted_at', null)
          .eq('is_spam', true),
      ])

      return {
        inbox: inboxQ.count ?? 0,
        archive: archiveQ.count ?? 0,
        spam: spamQ.count ?? 0,
        trash,
      }
    } catch {
      return empty
    }
  },

  /**
   * Get a single inbound email by ID
   */
  async getEmailById(id: string): Promise<EmailInbound | null> {
    const { data, error } = await supabase
      .from('email_inbound')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    const email = transformInboundRow(data as EmailInboundRow);
    return enrichEmailAttachmentsWithUrls(email);
  },

  /**
   * Get thread (conversation) for an email.
   *
   * A message that starts its own conversation has `thread_id = null`, and
   * `.eq('thread_id', null)` serialises to `thread_id=eq.null` — which
   * PostgREST passes to Postgres as the *string* 'null' and rejects with
   * `invalid input syntax for type uuid`. It has to be `.is(...)` to mean
   * SQL NULL. Previously this threw a 400 every time a non-threaded message
   * was opened.
   */
  async getThread(threadId: string | null | undefined): Promise<EmailInbound[]> {
    let query = supabase.from('email_inbound').select('*');
    query = threadId ? query.eq('thread_id', threadId) : query.is('thread_id', null);

    const { data, error } = await query
      .is('deleted_at', null)
      .order('received_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch thread: ${error.message}`);
    const emails = (data as EmailInboundRow[]).map(transformInboundRow);
    // Enrich all emails with attachment download URLs
    return emails.map(enrichEmailAttachmentsWithUrls);
  },

  /**
   * Mark email as read
   */
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_inbound')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw new Error(`Failed to mark as read: ${error.message}`);
  },

  /**
   * Mark email as unread
   */
  async markAsUnread(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_inbound')
      .update({ is_read: false })
      .eq('id', id);

    if (error) throw new Error(`Failed to mark as unread: ${error.message}`);
  },

  /**
   * Toggle starred status
   */
  async toggleStarred(id: string): Promise<boolean> {
    const email = await this.getEmailById(id);
    if (!email) throw new Error('Email not found');

    const newStatus = !email.isStarred;

    const { error } = await supabase
      .from('email_inbound')
      .update({ is_starred: newStatus })
      .eq('id', id);

    if (error) throw new Error(`Failed to toggle starred: ${error.message}`);
    return newStatus;
  },

  /**
   * Soft delete an email
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_inbound')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete email: ${error.message}`);
  },

  /**
   * Get unread count for an alias
   */
  async getUnreadCount(aliasId: string): Promise<number> {
    const { count, error } = await supabase
      .from('email_inbound')
      .select('id', { count: 'exact', head: true })
      .eq('alias_id', aliasId)
      .eq('is_read', false)
      .is('deleted_at', null);

    if (error) throw new Error(`Failed to get unread count: ${error.message}`);
    return count ?? 0;
  },

  /**
   * Search emails by subject or sender
   */
  async searchEmails(
    aliasId: string,
    query: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResult<EmailInbound>> {
    const { page = 1, pageSize = 20 } = options;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Strip PostgREST filter metacharacters before interpolating.
    const safe = escapePostgrestSearch(query.trim().slice(0, 100));

    // An empty term would produce a filter matching everything.
    if (!safe) {
      return { data: [], count: 0, hasMore: false };
    }

    const { data, error, count } = await supabase
      .from('email_inbound')
      .select('*', { count: 'exact' })
      .eq('alias_id', aliasId)
      .is('deleted_at', null)
      .or(
        `subject.ilike.%${safe}%,sender_email.ilike.%${safe}%,sender_name.ilike.%${safe}%`
      )
      .order('received_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to search emails: ${error.message}`);

    const emails = (data as EmailInboundRow[]).map(transformInboundRow);
    const enrichedEmails = emails.map(enrichEmailAttachmentsWithUrls);

    return {
      data: enrichedEmails,
      count: count ?? 0,
      hasMore: count !== null && from + pageSize < count,
    };
  },

  /**
   * Get all threads for an alias (grouped view)
   */
  async getThreads(
    aliasId: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResult<EmailInbound>> {
    const { page = 1, pageSize = 20 } = options;

    // Get the latest email from each thread
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('email_inbound')
      .select('*', { count: 'exact' })
      .eq('alias_id', aliasId)
      .is('deleted_at', null)
      .order('received_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch threads: ${error.message}`);

    const emails = (data as EmailInboundRow[]).map(transformInboundRow);
    const enrichedEmails = emails.map(enrichEmailAttachmentsWithUrls);

    return {
      data: enrichedEmails,
      count: count ?? 0,
      hasMore: count !== null && from + pageSize < count,
    };
  },
};
