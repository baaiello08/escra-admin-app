/**
 * Error Handling Utilities
 * 
 * Helper functions for extracting and displaying API errors consistently.
 */

/**
 * Extract error message from various error formats.
 * Handles both new standardized format and legacy formats.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred'
  
  // If it's already a string
  if (typeof error === 'string') return error
  
  // If it's an Error object
  if (error instanceof Error) {
    return error.message || 'An error occurred'
  }
  
  // If it's an object with error structure
  if (typeof error === 'object' && error !== null) {
    const err = error as any
    
    // New standardized format: { error: { message: "...", code: "..." } }
    if (err.error?.message) {
      return err.error.message
    }
    
    // Legacy formats
    if (err.detail) return err.detail
    if (err.message) return err.message
    
    // Try to stringify if possible
    try {
      return JSON.stringify(err)
    } catch {
      return 'An unknown error occurred'
    }
  }
  
  return 'An unexpected error occurred'
}

/**
 * Extract error code from error object.
 */
export function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  
  const err = error as any
  
  // New standardized format
  if (err.error?.code) return err.error.code
  
  // Error object with code property
  if (err.code) return err.code
  
  return undefined
}

/**
 * Extract validation errors from error object.
 */
export function getValidationErrors(error: unknown): Record<string, string> | undefined {
  if (!error || typeof error !== 'object') return undefined
  
  const err = error as any
  
  // New standardized format
  if (err.error?.errors) return err.error.errors
  
  // Legacy format
  if (err.errors) return err.errors
  
  return undefined
}

/**
 * Format validation errors for display.
 */
export function formatValidationErrors(errors: Record<string, string>): string {
  const entries = Object.entries(errors)
  if (entries.length === 0) return ''
  
  if (entries.length === 1) {
    return entries[0][1]
  }
  
  return entries.map(([field, message]) => `${field}: ${message}`).join(', ')
}

/**
 * Get full error message including validation errors if present.
 */
export function getFullErrorMessage(error: unknown): string {
  const message = getErrorMessage(error)
  const validationErrors = getValidationErrors(error)
  
  if (validationErrors) {
    const formatted = formatValidationErrors(validationErrors)
    return `${message}${formatted ? ` (${formatted})` : ''}`
  }
  
  return message
}

