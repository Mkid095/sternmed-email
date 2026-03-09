/**
 * Toast notification hooks
 *
 * Simple toast notification system using console for now.
 * Can be replaced with a proper toast library later.
 */

export function useToastSuccess() {
  return (message: string) => {
    // For now, just log to console - can be replaced with proper toast
    console.log('Success:', message)
  }
}

export function useToastError() {
  return (message: string) => {
    // For now, just log to console - can be replaced with proper toast
    console.error('Error:', message)
  }
}
