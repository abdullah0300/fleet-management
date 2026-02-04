import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface PhoneInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: string | null
    onChange?: (value: string) => void
}

const formatPhoneNumber = (value: string) => {
    if (!value) return ""

    // Remove all non-digits
    const digits = value.replace(/[^\d]/g, "")

    // Remove leading 1 if present (US country code) to format the rest
    const cleanNumber = digits.startsWith("1") && digits.length > 10
        ? digits.slice(1)
        : digits

    // If we have existing +1 in the raw value but it's just '1', ignore. 
    // Actually we usually receive '+1555...' so digits is '1555...'

    // We want to format the LAST 10 digits effectively if possible, 
    // or just format what we have.

    // Let's assume standard US numbers.
    // If digits > 10 (e.g. 15555555555), we strip the leading 1 for display formatting
    const displayDigits = (digits.length === 11 && digits.startsWith('1'))
        ? digits.slice(1)
        : digits

    const len = displayDigits.length

    if (len < 4) return displayDigits
    if (len < 7) return `(${displayDigits.slice(0, 3)}) ${displayDigits.slice(3)}`
    return `(${displayDigits.slice(0, 3)}) ${displayDigits.slice(3, 6)}-${displayDigits.slice(6, 10)}`
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ className, value, onChange, ...props }, ref) => {

        // Compute display value from the passed 'value' prop
        const displayValue = React.useMemo(() => {
            return formatPhoneNumber(value || "")
        }, [value])

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value

            // Extract digits
            // We allow user to type, we strip everything except digits
            const digits = inputValue.replace(/[^\d]/g, "")

            // Limit to 10 digits (US standard without prefix)
            const constrainedDigits = digits.slice(0, 10)

            // Form the value to send back: +1 + 10 digits
            // But only if we have something
            let finalValue = ""
            if (constrainedDigits.length > 0) {
                finalValue = `+1${constrainedDigits}`
            }

            if (onChange) {
                onChange(finalValue)
            }
        }

        return (
            <div className="relative">
                <span className="absolute left-3 top-2.5 h-4 text-muted-foreground text-sm z-10 pointer-events-none select-none flex items-center">
                    +1
                </span>
                <Input
                    type="tel"
                    className={cn("pl-9", className)}
                    onChange={handleChange}
                    ref={ref}
                    value={displayValue}
                    placeholder="(555) 555-5555"
                    maxLength={14} // (555) 555-5555 is 14 chars
                    {...props}
                />
            </div>
        )
    }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
