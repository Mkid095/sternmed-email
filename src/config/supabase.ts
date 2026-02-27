import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for email system
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
  alias_id: string
  sender_email: string
  sender_name?: string
  subject?: string
  body_html?: string
  body_text?: string
  attachments: any[]
  message_id?: string
  in_reply_to?: string
  references?: string
  is_read: boolean
  is_starred: boolean
  thread_id: string
  received_at: string
}

export interface EmailOutbound {
  id: string
  alias_id: string
  recipient_email: string
  cc?: string[]
  bcc?: string[]
  subject: string
  body_html?: string
  body_text?: string
  status: 'pending' | 'sent' | 'failed'
  external_message_id?: string
  error_message?: string
  sent_at?: string
  created_at: string
}

export interface User {
  id: string
  firebase_uid: string
  email: string
  role: 'admin' | 'staff' | 'email_user'
  email_alias_id?: string
  created_at: string
}
