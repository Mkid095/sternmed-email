import { create } from 'zustand'
import type { EmailOutbound } from '../../types'

interface SentModalState {
  selectedEmail: EmailOutbound | null
  isOpen: boolean
  open: (email: EmailOutbound) => void
  close: () => void
}

export const useSentDetailModalStore = create<SentModalState>((set) => ({
  selectedEmail: null,
  isOpen: false,
  open: (email) => set({ selectedEmail: email, isOpen: true }),
  close: () => set({ selectedEmail: null, isOpen: false }),
}))
