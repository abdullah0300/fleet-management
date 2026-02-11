import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a YYYY-MM-DD string to a readable date (e.g., "Feb 11")
 * explicitly ignoring timezones to prevent day-shifting.
 */
export function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  // If it's a full ISO string, take the date part
  const yyyymmdd = dateStr.split('T')[0]
  const [year, month, day] = yyyymmdd.split('-').map(Number)

  if (!year || !month || !day) return null

  // Create date at Local Midnight to ensure it displays correctly in current locale
  // or simply format it manually to avoid any Date object weirdness
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to safely parse time strings, ignoring timezone to show "wall clock" time
export function parseTime(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  // Case 1: Time Only (HH:mm or HH:mm:ss)
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(dateStr)) {
    const today = new Date().toISOString().split('T')[0]
    return new Date(`${today}T${dateStr}`)
  }

  // Case 2: ISO Date String
  // We want "Wall Clock" time. 
  // If the DB says "16:00:00+00", we want to show "16:00" regardless of user timezone.
  // So we strip the offset and 'Z' to force local interpretation of the time components.

  // Remove 'Z' and any offset like +05:00, -0500, +00
  const cleanStr = dateStr.replace('Z', '').replace(/[+-]\d{2}(:?\d{2})?$/, '')

  const date = new Date(cleanStr)
  return isNaN(date.getTime()) ? null : date
}

export function formatTime(dateStr: string | null | undefined): string | null {
  const dateObj = parseTime(dateStr)
  if (!dateObj) return dateStr || null // Fallback to original string if parsing fails
  return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
