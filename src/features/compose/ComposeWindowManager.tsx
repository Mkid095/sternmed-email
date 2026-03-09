import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Minus, Square } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import type { EmailInbound } from '../../types'

// Reuse compose logic as a custom hook
function useComposeForm(replyToId?: string, initialData?: any) {
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()

  // ... extract all compose logic from ComposeModal into this hook
  // For now, I'll just reuse ComposeModal component logic directly in the window
  // But to avoid duplication, let's refactor ComposeModal into a reusable component
  // that accepts isOpen, onClose as props but without the modal wrapper
  return { emailAliasId, colors, confirm, confirmation }
}

interface ComposeWindow {
  id: string
  replyToId?: string
  initialData?: any
  position: { x: number; y: number }
  size: { width: number; height: number }
  minimized: boolean
  zIndex: number
}

const COMPOSE_WIDTH = 800
const COMPOSE_HEIGHT = 600
const MINIMIZED_HEIGHT = 50
const OFFSET = 40

export default function ComposeWindowManager() {
  const navigate = useNavigate()
  const [windows, setWindows] = useState<ComposeWindow[]>([])
  const [highestZIndex, setHighestZIndex] = useState(100)

  const openCompose = useCallback((replyToId?: string, initialData?: any) => {
    const count = windows.length
    const newWindow: ComposeWindow = {
      id: crypto.randomUUID(),
      replyToId,
      initialData,
      position: { x: 100 + count * OFFSET, y: 100 + count * OFFSET },
      size: { width: COMPOSE_WIDTH, height: COMPOSE_HEIGHT },
      minimized: false,
      zIndex: highestZIndex + 1,
    }
    setWindows(prev => [...prev, newWindow])
    setHighestZIndex(prev => prev + 1)
  }, [windows.length, highestZIndex])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w))
  }, [])

  const bringToFront = useCallback((id: string) => {
    const newZ = highestZIndex + 1
    setHighestZIndex(newZ)
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: newZ } : w))
  }, [highestZIndex])

  // Expose openCompose globally via context or prop drilling?
  // We'll use a simple approach: EmailLayout will get the openCompose function
  // But EmailLayout is parent. So we need to lift state up or use context.
  // Let's use context: ComposeWindowContext

  // For now, render windows
  // This component will need to provide openCompose to children

  // Actually, better: Create a ComposeContext that provides openCompose
  // EmailLayout wraps children with ComposeProvider
  // Then any component can call openCompose()

  // Given time constraints, let's simplify: Don't use context yet. Instead,
  // pass openCompose as prop to ComposeButton via EmailLayout.
  // But InboxView/ThreadDetailView need it too (Reply button).
  // So we need a global solution.

  // SOLUTION: Use Zustand store for compose windows
  // Create useComposeStore.ts that manages windows array and actions
  // Then ComposeWindowManager reads from store, and any component can call openCompose()

  // Let's do that instead. This component will just render windows from the store.

  return null // This component will be replaced by store-based implementation
}
