/**
 * Toast notification store
 *
 * A small global store so that any module (React or not) can raise a toast
 * without needing access to component state. Consumed by <ToastContainer />.
 */

import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  /** Auto-dismiss delay in ms. Pass 0 to keep the toast until dismissed. */
  duration: number
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, variant?: ToastVariant, duration?: number) => string
  dismiss: (id: string) => void
  clear: () => void
}

const DEFAULT_DURATION = 4000

/** Cap the stack so a burst of errors cannot cover the UI. */
const MAX_VISIBLE = 4

let counter = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, variant = 'info', duration = DEFAULT_DURATION) => {
    // De-duplicate consecutive identical messages instead of stacking them.
    const duplicate = get().toasts.find(
      (t) => t.message === message && t.variant === variant
    )
    if (duplicate) return duplicate.id

    counter += 1
    const id = `toast-${counter}`
    const toast: Toast = { id, message, variant, duration }

    set((state) => ({
      // Keep the newest toasts; drop the oldest when over the cap.
      toasts: [...state.toasts, toast].slice(-MAX_VISIBLE),
    }))

    return id
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clear: () => set({ toasts: [] }),
}))

/**
 * Imperative helpers for call sites that are outside the React tree
 * (services, event handlers wired directly to Supabase).
 */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'error', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'info', duration),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
}