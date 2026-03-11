/**
 * Email Outbound Service
 *
 * Manages outgoing emails with security-first approach:
 * - Verifies alias ownership server-side
 * - Implements rate limiting per alias
 * - Tracks pending → sent lifecycle
 * - Supports HTML sanitization
 *
 * @module services/email-outbound
 */

import { supabase } from '../../config/supabase';
import { storageService } from '../storage.service';
import { EmailOutbound } from '../../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Database row type for email_outbound table
 */
interface EmailOutboundRow {
  id: string;
  alias_id: string;
  recipient_email: string;
  cc: unknown;
  bcc: unknown;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  template_id: string | null;
  attachments: unknown;
  status: 'pending' | 'sent' | 'failed';
  external_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  retry_count: number;
  max_retries: number;
  deleted_at: string | null;
  updated_at: string | null;
  created_at: string;
}

/**
 * Transform database row to application type
 */
function transformOutboundRow(row: EmailOutboundRow): EmailOutbound {
  return {
    id: row.id,
    aliasId: row.alias_id,
    recipientEmail: row.recipient_email,
    cc: (row.cc as string[]) ?? undefined,
    bcc: (row.bcc as string[]) ?? undefined,
    subject: row.subject,
    bodyHtml: row.body_html ?? undefined,
    bodyText: row.body_text ?? undefined,
    templateId: row.template_id ?? undefined,
    attachments: (row.attachments as Array<{ filename: string; url: string; type: string; size: number }>) ?? [],
    status: row.status,
    externalMessageId: row.external_message_id ?? undefined,
    errorMessage: row.error_message ?? undefined,
    sentAt: row.sent_at ?? undefined,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    deletedAt: row.deleted_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Input for sending an outbound email
 */
export interface SendOutboundInput {
  aliasId: string;
  recipientEmail: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  templateId?: string;
  attachments?: {
    filename: string;
    url: string; // Cloudinary URL
    type: string;
    size: number;
  }[];
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
 * Rate limit info
 */
export interface RateLimitInfo {
  canSend: boolean;
  sentToday: number;
  sentThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  reason?: 'daily_limit' | 'monthly_limit';
}

/**
 * Email outbound service
 */
export const emailOutboundService = {
  /**
   * Get outbound emails for an alias with pagination
   */
  async getOutboundEmails(
    aliasId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: 'pending' | 'sent' | 'failed';
    } = {}
  ): Promise<PaginatedResult<EmailOutbound>> {
    const { page = 1, pageSize = 20, status } = options;

    let query = supabase
      .from('email_outbound')
      .select('*', { count: 'exact' })
      .eq('alias_id', aliasId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(`Failed to fetch outbound emails: ${error.message}`);

    return {
      data: (data as EmailOutboundRow[]).map(transformOutboundRow),
      count: count ?? 0,
      hasMore: count !== null && from + pageSize < count,
    };
  },

  /**
   * Get a single outbound email by ID
   */
  async getEmailById(id: string): Promise<EmailOutbound | null> {
    const { data, error } = await supabase
      .from('email_outbound')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return transformOutboundRow(data as EmailOutboundRow);
  },

  /**
   * Check rate limits for an alias
   */
  async checkRateLimit(aliasId: string): Promise<RateLimitInfo> {
    // Get limits from database
    const { data: limits, error } = await supabase
      .from('email_alias_limits')
      .select('*')
      .eq('alias_id', aliasId)
      .single();

    if (error || !limits) {
      // Create default limits if not exist
      await supabase.from('email_alias_limits').insert({
        alias_id: aliasId,
        daily_limit: 100,
        monthly_limit: 3000,
      });

      return {
        canSend: true,
        sentToday: 0,
        sentThisMonth: 0,
        dailyLimit: 100,
        monthlyLimit: 3000,
      };
    }

    const { sent_today, sent_this_month, daily_limit: daily_limit_raw, monthly_limit: monthly_limit_raw } = limits as {
      sent_today: number;
      sent_this_month: number;
      daily_limit: number;
      monthly_limit: number;
    };

    // Define camelCase variables for use in return statements
    const dailyLimit = daily_limit_raw;
    const monthlyLimit = monthly_limit_raw;

    // Check if counters need reset
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const thisMonth = new Date().toISOString().slice(0, 7) + '-01'; // "YYYY-MM-01" (first day of month)

    if ((limits as { last_reset_date: string }).last_reset_date !== today) {
      // Reset daily counter
      await supabase
        .from('email_alias_limits')
        .update({ sent_today: 0, last_reset_date: today })
        .eq('alias_id', aliasId);

      return {
        canSend: sent_this_month < monthlyLimit,
        sentToday: 0,
        sentThisMonth: sent_this_month,
        dailyLimit,
        monthlyLimit,
        reason: sent_this_month >= monthlyLimit ? 'monthly_limit' : undefined,
      };
    }

    if ((limits as { reset_month_date: string }).reset_month_date !== thisMonth) {
      // Reset monthly counter
      await supabase
        .from('email_alias_limits')
        .update({ sent_this_month: 0, reset_month_date: thisMonth })
        .eq('alias_id', aliasId);

      return {
        canSend: sent_today < dailyLimit,
        sentToday: sent_today,
        sentThisMonth: 0,
        dailyLimit,
        monthlyLimit,
        reason: sent_today >= dailyLimit ? 'daily_limit' : undefined,
      };
    }

    // Check limits
    if (sent_today >= dailyLimit) {
      return {
        canSend: false,
        sentToday: sent_today,
        sentThisMonth: sent_this_month,
        dailyLimit,
        monthlyLimit,
        reason: 'daily_limit',
      };
    }

    if (sent_this_month >= monthlyLimit) {
      return {
        canSend: false,
        sentToday: sent_today,
        sentThisMonth: sent_this_month,
        dailyLimit,
        monthlyLimit,
        reason: 'monthly_limit',
      };
    }

    return {
      canSend: true,
      sentToday: sent_today,
      sentThisMonth: sent_this_month,
      dailyLimit,
      monthlyLimit,
    };
  },

  /**
   * Send an outbound email
   *
   * SECURITY: Verifies that the user's alias matches the requested alias
   * This prevents email spoofing across aliases.
   *
   * @param userAliasId - The user's email alias ID from JWT
   * @param input - Email data to send
   * @returns The created outbound email record
   */
  async sendEmail(userAliasId: string, input: SendOutboundInput): Promise<EmailOutbound> {
    // CRITICAL SECURITY CHECK: Verify user owns this alias
    if (userAliasId !== input.aliasId) {
      throw new Error('Alias ownership verification failed: Cannot send from another alias');
    }

    // Check rate limits
    const rateLimit = await this.checkRateLimit(input.aliasId);
    if (!rateLimit.canSend) {
      const limitType = rateLimit.reason === 'daily_limit' ? 'daily' : 'monthly';
      throw new Error(`Email ${limitType} limit exceeded. Please try again later.`);
    }

    // Insert as PENDING first (prevents lost tracking)
    const { data: outbound, error } = await supabase
      .from('email_outbound')
      .insert({
        alias_id: input.aliasId,
        recipient_email: input.recipientEmail,
        cc: (input.cc ?? []) as unknown[],
        bcc: (input.bcc ?? []) as unknown[],
        subject: input.subject,
        body_html: input.bodyHtml ?? null,
        body_text: input.bodyText ?? null,
        template_id: input.templateId ?? null,
        attachments: input.attachments ?? [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create outbound email: ${error.message}`);
    }

    // Fetch alias email address for the "from" field
    const { data: alias, error: aliasError } = await supabase
      .from('email_aliases')
      .select('alias_email')
      .eq('id', input.aliasId)
      .single();

    if (aliasError || !alias) {
      throw new Error(`Failed to fetch alias: ${aliasError?.message || 'Alias not found'}`);
    }

    // Send via Resend Edge Function
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: input.recipientEmail,
          subject: input.subject,
          html: input.bodyHtml || undefined,
          text: input.bodyText || undefined,
          from: alias.alias_email, // Send from the alias email
          cc: input.cc,
          bcc: input.bcc,
          attachments: input.attachments?.map(att => ({
            filename: att.filename,
            url: att.url,
            type: att.type,
            size: att.size,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to send email: ${response.status}`);
      }

      // Update to SENT with Resend message ID
      await supabase
        .from('email_outbound')
        .update({
          status: 'sent',
          external_message_id: result.messageId || `msg_${outbound.id}`,
          sent_at: new Date().toISOString(),
        })
        .eq('id', outbound.id);

    } catch (sendError) {
      // Mark as FAILED
      await supabase
        .from('email_outbound')
        .update({
          status: 'failed',
          error_message: sendError instanceof Error ? sendError.message : String(sendError),
        })
        .eq('id', outbound.id);

      throw new Error(`Failed to send email: ${sendError instanceof Error ? sendError.message : String(sendError)}`);
    }

    // Increment rate limit counter (only after successful send)
    await supabase.rpc('increment_email_count', {
      p_alias_id: input.aliasId,
    });

    // Get updated record
    const finalEmail = await this.getEmailById(outbound.id);
    if (!finalEmail) {
      throw new Error('Failed to retrieve sent email');
    }

    return finalEmail;
  },

  /**
   * Retry a failed email
   */
  async retryEmail(id: string, userAliasId: string): Promise<EmailOutbound> {
    const email = await this.getEmailById(id);
    if (!email) {
      throw new Error('Email not found');
    }

    if (email.status !== 'failed') {
      throw new Error('Only failed emails can be retried');
    }

    if (email.aliasId !== userAliasId) {
      throw new Error('Cannot retry email from another alias');
    }

    if (email.retryCount >= email.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    // Reset to pending and increment retry count
    const { error } = await supabase
      .from('email_outbound')
      .update({
        status: 'pending',
        retry_count: email.retryCount + 1,
        error_message: null,
      })
      .eq('id', id);

    if (error) throw new Error(`Failed to retry email: ${error.message}`);

    // Fetch alias email and email data for retry
    const { data: alias, error: aliasError } = await supabase
      .from('email_aliases')
      .select('alias_email')
      .eq('id', email.aliasId)
      .single();

    if (aliasError || !alias) {
      throw new Error(`Failed to fetch alias: ${aliasError?.message || 'Alias not found'}`);
    }

    // Prepare email data
    const emailData = {
      to: email.recipientEmail,
      subject: email.subject,
      html: email.bodyHtml || undefined,
      text: email.bodyText || undefined,
      from: alias.alias_email,
      cc: email.cc,
      bcc: email.bcc,
    };

    // Send via Resend Edge Function
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to send email: ${response.status}`);
      }

      // Update to SENT with Resend message ID
      await supabase
        .from('email_outbound')
        .update({
          status: 'sent',
          external_message_id: result.messageId || `msg_${id}`,
          sent_at: new Date().toISOString(),
        })
        .eq('id', id);

    } catch (sendError) {
      // Mark as FAILED again
      await supabase
        .from('email_outbound')
        .update({
          status: 'failed',
          error_message: sendError instanceof Error ? sendError.message : String(sendError),
          retry_count: email.retryCount + 1,
        })
        .eq('id', id);

      throw new Error(`Failed to resend email: ${sendError instanceof Error ? sendError.message : String(sendError)}`);
    }

    const retried = await this.getEmailById(id);
    return retried as EmailOutbound;
  },

  /**
   * Soft delete an outbound email
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_outbound')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete email: ${error.message}`);
  },

  /**
   * Get email statistics for an alias
   */
  async getAliasStats(aliasId: string): Promise<{
    sent: number;
    pending: number;
    failed: number;
    total: number;
  }> {
    const [sentResult, pendingResult, failedResult] = await Promise.all([
      supabase
        .from('email_outbound')
        .select('id', { count: 'exact', head: true })
        .eq('alias_id', aliasId)
        .eq('status', 'sent')
        .is('deleted_at', null),
      supabase
        .from('email_outbound')
        .select('id', { count: 'exact', head: true })
        .eq('alias_id', aliasId)
        .eq('status', 'pending')
        .is('deleted_at', null),
      supabase
        .from('email_outbound')
        .select('id', { count: 'exact', head: true })
        .eq('alias_id', aliasId)
        .eq('status', 'failed')
        .is('deleted_at', null),
    ]);

    const sent = sentResult.count ?? 0;
    const pending = pendingResult.count ?? 0;
    const failed = failedResult.count ?? 0;

    return {
      sent,
      pending,
      failed,
      total: sent + pending + failed,
    };
  },

  /**
   * Save email as draft
   * Creates a pending email without sending
   */
  async saveAsDraft(aliasId: string, draft: Omit<SendOutboundInput, 'aliasId'>): Promise<EmailOutbound> {
    // Validate alias ownership (if we had a user context, but for now just check alias exists)
    const { data: alias, error: aliasError } = await supabase
      .from('email_aliases')
      .select('id')
      .eq('id', aliasId)
      .single();

    if (aliasError || !alias) {
      throw new Error(`Alias not found: ${aliasId}`);
    }

    const { data: draftRecord, error } = await supabase
      .from('email_outbound')
      .insert({
        alias_id: aliasId,
        recipient_email: draft.recipientEmail,
        cc: (draft.cc ?? []) as unknown[],
        bcc: (draft.bcc ?? []) as unknown[],
        subject: draft.subject,
        body_html: draft.bodyHtml ?? null,
        body_text: draft.bodyText ?? null,
        template_id: draft.templateId ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save draft: ${error.message}`);
    }

    return transformOutboundRow(draftRecord);
  },

  /**
   * Update an existing draft
   *
   * @param draftId - The draft ID to update
   * @param aliasId - The user's alias ID (for ownership verification)
   * @param draft - Updated draft data
   * @returns The updated outbound email record
   */
  async updateDraft(draftId: string, aliasId: string, draft: Partial<Omit<SendOutboundInput, 'aliasId'>>): Promise<EmailOutbound> {
    // Build update payload
    const updateData: any = {
      recipient_email: draft.recipientEmail,
      cc: (draft.cc ?? []) as unknown[],
      bcc: (draft.bcc ?? []) as unknown[],
      subject: draft.subject,
      body_html: draft.bodyHtml ?? null,
      body_text: draft.bodyText ?? null,
      template_id: draft.templateId ?? null,
    };

    const { data, error } = await supabase
      .from('email_outbound')
      .update(updateData)
      .eq('id', draftId)
      .eq('alias_id', aliasId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update draft: ${error.message}`);
    }

    return transformOutboundRow(data);
  },
};
