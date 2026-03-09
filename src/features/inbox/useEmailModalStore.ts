import { create } from 'zustand'
import type { EmailInbound } from '../../types'

interface EmailModalState {
  thread: EmailInbound[] | null
  isOpen: boolean
  open: (thread: EmailInbound[]) => void
  close: () => void
}

export const useEmailModalStore = create<EmailModalState>((set) => ({
  thread: null,
  isOpen: false,
  open: (thread) => set({ thread, isOpen: true }),
  close: () => set({ thread: null, isOpen: false }),
}))
