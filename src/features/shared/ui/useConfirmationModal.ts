import { useState, useCallback } from 'react'
import ConfirmationModal from './ConfirmationModal'

interface ConfirmationOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean
  resolve: (value: boolean) => void
}

/**
 * Hook for managing confirmation modals
 *
 * Provides a simple API for showing confirmation dialogs:
 * const { confirm } = useConfirmationModal()
 * const result = await confirm({
 *   title: 'Delete Item',
 *   message: 'Are you sure?',
 *   confirmLabel: 'Delete',
 *   variant: 'danger'
 * })
 *
 * if (result) {
 *   // User confirmed
 * }
 */
export default function useConfirmationModal() {
  const [state, setState] = useState<ConfirmationState | null>(null)

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({
        ...options,
        isOpen: true,
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (state?.resolve) {
      state.resolve(true)
    }
    setState(null)
  }, [state])

  const handleCancel = useCallback(() => {
    if (state?.resolve) {
      state.resolve(false)
    }
    setState(null)
  }, [state])

  return {
    confirm,
    confirmation: state
      ? {
          isOpen: state.isOpen,
          title: state.title,
          message: state.message,
          confirmLabel: state.confirmLabel,
          cancelLabel: state.cancelLabel,
          variant: state.variant,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        }
      : null,
  }
}

