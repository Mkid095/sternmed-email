/**
 * Email Inbound Service
 *
 * Manages received emails for email aliases.
 * Supports pagination, threading, search, and filtering.
 *
 * @module services/email-inbound
 */

import { supabase } from '../../config/supabase';
import { EmailInbound } from '../../types';
import { cloudinaryConfig } from '../../config/cloudinary';

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
 * Transform attachment data to include download URL
 */
function transformAttachmentWithUrl(
  attachment: { id: string; filename: string; contentType: string; size: number; storagePath: string }
): { id: string; filename: string; contentType: string; size: number; storagePath: string; url: string } {
  const url = getAttachmentDownloadUrl(attachment.storagePath, attachment.contentType);
  return { ...attachment, url };
}

/**
 * Transform attachments array to include download URLs
 */
function transformAttachmentsWithUrls(
  attachments: Array<{ id: string; filename: string; contentType: string; size: number; storagePath: string }>
): Array<{ id: string; filename: string; contentType: string; size: number; storagePath: string; url: string }> {
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
    attachments: (row.attachments as Array<{ id: string; filename: string; contentType: string; size: number; storagePath: string }>) ?? [],
    messageId: row.message_id ?? undefined,
    inReplyTo: row.in_reply_to ?? undefined,
    references: row.references ?? undefined,
    spfPass: row.spf_pass,
    dkimPass: row.dkim_pass,
    isRead: row.is_read,
    isStarred: row.is_starred,
    deletedAt: row.deleted_at ?? undefined,
    receivedAt: row.received_at,
    createdAt: row.created_at,
  };
}

/**
 * Enrich email attachments with download URLs
 */
function enrichEmailAttachmentsWithUrls(email: EmailInbound): EmailInbound {
  if (!email.attachments || email.attachments.length === 0) {
    return email;
  }
  const enrichedAttachments = transformAttachmentsWithUrls(email.attachments);
  return { ...email, attachments: enrichedAttachments };
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
 * Email inbound service
 */
export const emailInboundService = {
  /**
   * Get inbound emails for an alias with pagination
   */
  async getInboundEmails(
    aliasId: string,
    options: {
      page?: number;
      pageSize?: number;
      unreadOnly?: boolean;
      starredOnly?: boolean;
      threadId?: string;
    } = {}
  ): Promise<PaginatedResult<EmailInbound>> {
    const {
      page = 1,
      pageSize = 20,
      unreadOnly = false,
      starredOnly = false,
      threadId,
    } = options;

    let query = supabase
      .from('email_inbound')
      .select('*', { count: 'exact' })
      .eq('alias_id', aliasId)
      .is('deleted_at', null)
      .order('received_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    if (starredOnly) {
      query = query.eq('is_starred', true);
    }
    if (threadId) {
      query = query.eq('thread_id', threadId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);

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
   * Get thread (conversation) for an email
   */
  async getThread(threadId: string): Promise<EmailInbound[]> {
    const { data, error } = await supabase
      .from('email_inbound')
      .select('*')
      .eq('thread_id', threadId)
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

    // Use full-text search index
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('email_inbound')
      .select('*', { count: 'exact' })
      .eq('alias_id', aliasId)
      .is('deleted_at', null)
      .or(`subject.ilike.%${query}%,sender_email.ilike.%${query}%,sender_name.ilike.%${query}%`)
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
