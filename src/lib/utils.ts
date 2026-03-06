import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Formats a date string explicitly to the User's Local Timezone
 */
export function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  // If it's just a YYYY-MM-DD date without time (e.g. custom scheduled dates), manual parse without shifting
  if (!dateStr.includes('T')) {
    const [year, month, day] = dateStr.split(' ')[0].split('-').map(Number)
    if (!year || !month || !day) return null
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // If it's a full ISO timestamp from Supabase Database
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null

  // Force display in User Device Time
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

// Ensure `parseTime` continues to work if explicitly called elsewhere
export function parseTime(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Universal time formatter that converts ALL UTC times into the User's Device Time
 */
export function formatTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  // Case 1: Raw Time Only (HH:mm)
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(dateStr)) {
    const [hours, minutes] = dateStr.split(':')
    const d = new Date()
    d.setHours(Number(hours), Number(minutes), 0)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Case 2: Full ISO Timestamp
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null

  // Format to standard User Device Time
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}
