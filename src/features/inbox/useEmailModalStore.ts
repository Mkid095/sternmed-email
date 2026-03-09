import { create } from 'zustand'
import type { EmailInbound } from '../../types'

interface EmailModalState {
  selectedEmail: EmailInbound | null
  isOpen: boolean
  open: (email: EmailInbound) => void
  close: () => void
}

export const useEmailModalStore = create<EmailModalState>((set) => ({
  selectedEmail: null,
  isOpen: false,
  open: (email) => set({ selectedEmail: email, isOpen: true }),
  close: () => set({ selectedEmail: null, isOpen: false }),
}))
