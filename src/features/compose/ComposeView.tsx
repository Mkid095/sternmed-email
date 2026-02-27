import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, X, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'

export default function ComposeView() {
  const navigate = useNavigate()
  const { emailAliasId, user } = useAuthStore()
  
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!emailAliasId) {
      alert('No email alias configured')
      return
    }

    if (!to || !subject) {
      alert('Please fill in recipient and subject')
      return
    }

    setSending(true)

    try {
      // Get alias details
      const { data: alias } = await supabase
        .from('email_aliases')
        .select('alias_email')
        .eq('id', emailAliasId)
        .single()

      // Store in email_outbound as pending
      const { error } = await supabase
        .from('email_outbound')
        .insert({
          alias_id: emailAliasId,
          recipient_email: to,
          cc: cc ? [cc] : [],
          subject,
          body_html: body.replace(/\n/g, '<br>'),
          body_text: body,
          status: 'pending',
        })

      if (error) throw error

      // Reset form
      setTo('')
      setCc('')
      setSubject('')
      setBody('')

      // Navigate to sent
      navigate('/sent')
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">New Message</h1>
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-100">
            <div className="p-4">
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="To"
                className="w-full px-4 py-2 border-0 focus:ring-0"
              />
            </div>
            
            <div className="p-4">
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc"
                className="w-full px-4 py-2 border-0 focus:ring-0"
              />
            </div>

            <div className="p-4">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-4 py-2 border-0 focus:ring-0 font-medium"
              />
            </div>

            <div className="p-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={15}
                className="w-full px-4 py-2 border-0 focus:ring-0 resize-none"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              From: {user?.email}
            </p>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
