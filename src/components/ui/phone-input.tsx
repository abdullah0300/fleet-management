'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PhoneInputProps {
    value?: string | null
    onChange?: (value: string) => void
    placeholder?: string
    className?: string
    id?: string
    disabled?: boolean
}

/**
 * Extract only the 10 local US digits from any phone string.
 * Strips +1 prefix first before anything else.
 */
function extractDigits(val: string): string {
    let cleaned = (val || '').trim()
    // Strip +1 country code first
    if (cleaned.startsWith('+1')) cleaned = cleaned.slice(2)
    // Extract only digits from the remainder
    return cleaned.replace(/\D/g, '').slice(0, 10)
}

/**
 * Formats a 10-digit string into (XXX) XXX-XXXX as the user types
 */
function formatDisplay(digits: string): string {
    const d = digits.slice(0, 10)
    if (d.length === 0) return ''
    if (d.length <= 3) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ className, value, onChange, placeholder = '(555) 555-5555', id, disabled }, ref) => {

        const displayValue = React.useMemo(
            () => formatDisplay(extractDigits(value || '')),
            [value]
        )

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
            // Store as +1XXXXXXXXXX, or empty string if no digits
            onChange?.(digits.length > 0 ? `+1${digits}` : '')
        }

        return (
            <div className={cn('relative', className)}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none select-none z-10">
                    <span className="text-base leading-none">🇺🇸</span>
                    <span className="text-xs font-medium text-muted-foreground">+1</span>
                    <span className="text-muted-foreground/30 text-sm ml-0.5">|</span>
                </div>
                <input
                    ref={ref}
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    disabled={disabled}
                    value={displayValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    maxLength={14}
                    className={cn(
                        'flex h-10 w-full rounded-md border border-input bg-background pl-[4.5rem] pr-3 py-2 text-sm',
                        'ring-offset-background placeholder:text-muted-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50 tracking-wide'
                    )}
                />
            </div>
        )
    }
)

PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
