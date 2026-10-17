/**
 * Toast notification hooks
 *
 * Thin wrappers over the global toast store so existing call sites
 * (`const showSuccess = useToastSuccess()`) keep working unchanged.
 * See ./toastStore.ts and mount <ToastContainer /> once in the layout.
 */

import { useCallback } from 'react'
import { useToastStore } from './toastStore'

export function useToastSuccess() {
  return useCallback((message: string) => {
    useToastStore.getState().show(message, 'success')
  }, [])
}

export function useToastError() {
  return useCallback((message: string) => {
    // Errors linger: 6s, or stay until dismissed.
    useToastStore.getState().show(message, 'error', 6000)
  }, [])
}

export function useToastInfo() {
  return useCallback((message: string) => {
    useToastStore.getState().show(message, 'info')
  }, [])
}