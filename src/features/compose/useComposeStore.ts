/**
 * Compose Store
 *
 * Global state management for multiple compose windows.
 * Handles opening, closing, minimizing, restoring, and z-index stacking.
 *
 * @module features/compose/useComposeStore
 */

import { create } from 'zustand'
import type { EmailInbound } from '../../types'

/**
 * Initial compose form data (for opening compose windows)
 */
export interface ComposeInitialData {
  to?: string[]
  cc?: string[]
  bcc?: string[]
  subject?: string
  body?: string
}

/**
 * Compose window instance
 */
export interface ComposeWindow {
  /** Unique identifier */
  id: string
  /** Original email for reply/forward */
  replyToEmail?: EmailInbound
  /** Initial form data (for reply/forward or editing) */
  initialData?: ComposeInitialData
  /** Draft ID if editing an existing draft */
  draftId?: string
  /** Window position */
  position: { x: number; y: number }
  /** Window dimensions */
  size: { width: number; height: number }
  /** Whether minimized */
  minimized: boolean
  /** Z-index for stacking */
  zIndex: number
}

/**
 * Compose store state and actions
 */
interface ComposeStore {
  /** All active compose windows */
  windows: ComposeWindow[]
  /** Highest z-index used */
  highestZIndex: number
  /** Open a new compose window */
  openCompose: (initialData?: ComposeInitialData, replyToEmail?: EmailInbound, draftId?: string) => void
  /** Close a compose window */
  closeCompose: (id: string) => void
  /** Minimize/restore a compose window (toggles minimized flag) */
  minimizeCompose: (id: string) => void
  /** Restore a compose window (set minimized to false) */
  restoreCompose: (id: string) => void
  /** Bring a compose window to front (increase z-index) */
  bringToFront: (id: string) => void
  /** Update window position */
  updateWindowPosition: (id: string, x: number, y: number) => void
}

const COMPOSE_WIDTH = 600
const COMPOSE_HEIGHT = 500
const OFFSET = 30

export const useComposeStore = create<ComposeStore>((set, get) => ({
  windows: [],
  highestZIndex: 100,

  openCompose: (initialData, replyToEmail, draftId) => {
    const { windows, highestZIndex } = get()
    const count = windows.length
    const newWindow: ComposeWindow = {
      id: crypto.randomUUID(),
      replyToEmail,
      initialData,
      draftId,
      position: { x: 100 + count * OFFSET, y: 100 + count * OFFSET },
      size: { width: COMPOSE_WIDTH, height: COMPOSE_HEIGHT },
      minimized: false,
      zIndex: highestZIndex + 1,
    }
    set({
      windows: [...windows, newWindow],
      highestZIndex: highestZIndex + 1,
    })
  },

  closeCompose: (id) => set((state) => ({
    windows: state.windows.filter((w) => w.id !== id),
  })),

  minimizeCompose: (id) => set((state) => ({
    windows: state.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
  })),

  restoreCompose: (id) => set((state) => ({
    windows: state.windows.map((w) => (w.id === id ? { ...w, minimized: false } : w)),
  })),

  bringToFront: (id) => set((state) => {
    const maxZ = Math.max(...state.windows.map((w) => w.zIndex), 100)
    return {
      windows: state.windows.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w)),
      highestZIndex: maxZ + 1,
    }
  }),

  updateWindowPosition: (id, x, y) => set((state) => ({
    windows: state.windows.map((w) => (w.id === id ? { ...w, position: { x, y } } : w)),
  })),
}))
