'use client'

import { useState, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQueryClient } from '@tanstack/react-query'
import { bulkImportDrivers, DriverImportRow } from '@/app/dashboard/drivers/actions'
import { driverKeys } from '@/hooks/useDrivers'

interface ParsedDriver extends DriverImportRow {
    _rowIndex: number
    _errors: string[]
}

interface BulkDriverImportProps {
    trigger?: React.ReactNode
}

const REQUIRED_COLUMNS = ['email', 'full_name']
const OPTIONAL_COLUMNS = ['phone', 'license_number', 'license_expiry', 'payment_type', 'rate_amount', 'status', 'login_pin']
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

const VALID_PAYMENT_TYPES = ['per_mile', 'per_trip', 'hourly', 'salary']
const VALID_STATUSES = ['available', 'on_trip', 'off_duty']

/** Returns true only if the date string represents a real calendar date */
function isCalendarDateValid(year: number, month: number, day: number): boolean {
    // month is 1-based here
    const d = new Date(year, month - 1, day)
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

export function BulkDriverImport({ trigger }: BulkDriverImportProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
    const [parsedDrivers, setParsedDrivers] = useState<ParsedDriver[]>([])
    const [importResult, setImportResult] = useState<{
        successful: number
        failed: { email: string; error: string }[]
    } | null>(null)

    const queryClient = useQueryClient()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const parseCSV = (text: string): ParsedDriver[] => {
        const result = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            transformHeader: (h) => h.toLowerCase().trim(),
        })

        if (result.errors.length > 0 && result.data.length === 0) {
            throw new Error(`CSV parse error: ${result.errors[0].message}`)
        }

        const header = result.meta.fields ?? []

        const missingRequired = REQUIRED_COLUMNS.filter(col => !header.includes(col))
        if (missingRequired.length > 0) {
            throw new Error(`Missing required columns: ${missingRequired.join(', ')}`)
        }

        const seenEmails = new Set<string>()
        const drivers: ParsedDriver[] = []

        result.data.forEach((row, i) => {
            const errors: string[] = []
            const rowIndex = i + 2 // 1-based + header row

            const driver: ParsedDriver = {
                _rowIndex: rowIndex,
                _errors: errors,
                email: '',
                full_name: '',
            }

            // email
            const rawEmail = row['email']?.trim() || ''
            if (!rawEmail) {
                errors.push('Email is required')
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(rawEmail)) {
                    errors.push('Invalid email format')
                } else {
                    const normalised = rawEmail.toLowerCase()
                    if (seenEmails.has(normalised)) {
                        errors.push(`Duplicate email in file: ${normalised}`)
                    } else {
                        seenEmails.add(normalised)
                        driver.email = normalised
                    }
                }
            }

            // full_name
            const fullName = row['full_name']?.trim() || ''
            if (!fullName) {
                errors.push('Full name is required')
            } else {
                driver.full_name = fullName
            }

            // phone
            const phone = row['phone']?.trim()
            if (phone) driver.phone = phone

            // license_number
            const licenseNumber = row['license_number']?.trim()
            if (licenseNumber) driver.license_number = licenseNumber

            // license_expiry — accept MM/DD/YYYY or YYYY-MM-DD, validate calendar
            const expiryRaw = row['license_expiry']?.trim()
            if (expiryRaw) {
                const usDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
                const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
                const usMatch = expiryRaw.match(usDateRegex)
                const isoMatch = expiryRaw.match(isoDateRegex)

                if (usMatch) {
                    const month = parseInt(usMatch[1])
                    const day = parseInt(usMatch[2])
                    const year = parseInt(usMatch[3])
                    if (!isCalendarDateValid(year, month, day)) {
                        errors.push(`Invalid license expiry date: ${expiryRaw}`)
                    } else {
                        driver.license_expiry = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    }
                } else if (isoMatch) {
                    const year = parseInt(isoMatch[1])
                    const month = parseInt(isoMatch[2])
                    const day = parseInt(isoMatch[3])
                    if (!isCalendarDateValid(year, month, day)) {
                        errors.push(`Invalid license expiry date: ${expiryRaw}`)
                    } else {
                        driver.license_expiry = expiryRaw
                    }
                } else {
                    errors.push('Invalid license expiry date format (use MM/DD/YYYY or YYYY-MM-DD)')
                }
            }

            // payment_type
            const paymentType = row['payment_type']?.trim().toLowerCase()
            if (paymentType) {
                if (!VALID_PAYMENT_TYPES.includes(paymentType)) {
                    errors.push(`Invalid payment type. Use: ${VALID_PAYMENT_TYPES.join(', ')}`)
                } else {
                    driver.payment_type = paymentType as 'per_mile' | 'per_trip' | 'hourly' | 'salary'
                }
            }

            // rate_amount
            const rateStr = row['rate_amount']?.trim()
            if (rateStr) {
                const rate = parseFloat(rateStr)
                if (isNaN(rate) || rate < 0) {
                    errors.push('Invalid rate amount')
                } else {
                    driver.rate_amount = rate
                }
            }

            // status
            const status = row['status']?.trim().toLowerCase()
            if (status) {
                if (!VALID_STATUSES.includes(status)) {
                    errors.push(`Invalid status. Use: ${VALID_STATUSES.join(', ')}`)
                } else {
                    driver.status = status as 'available' | 'on_trip' | 'off_duty'
                }
            }

            // login_pin
            const pin = row['login_pin']?.trim()
            if (pin) {
                const pinRegex = /^\d{4,6}$/
                if (!pinRegex.test(pin)) {
                    errors.push('Invalid PIN (must be 4-6 digits)')
                } else {
                    driver.login_pin = pin
                }
            }

            drivers.push(driver)
        })

        return drivers
    }

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string
                const drivers = parseCSV(text)

                if (drivers.length === 0) {
                    alert('No valid rows found in CSV')
                    return
                }

                setParsedDrivers(drivers)
                setStep('preview')
            } catch (error) {
                alert(error instanceof Error ? error.message : 'Failed to parse CSV')
                setStep('upload')
            }
        }
        reader.readAsText(file)
    }, [])

    const handleImport = async () => {
        const validDrivers = parsedDrivers
            .filter(d => d._errors.length === 0)
            .map(({ _rowIndex, _errors, ...driver }) => driver)

        if (validDrivers.length === 0) {
            alert('No valid drivers to import')
            return
        }

        setStep('importing')

        try {
            const result = await bulkImportDrivers(validDrivers)
            setImportResult(result)

            // Refetch drivers list
            queryClient.invalidateQueries({ queryKey: driverKeys.lists() })

            setStep('result')
        } catch (error) {
            alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
            setStep('preview')
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
            setStep('upload')
            setParsedDrivers([])
            setImportResult(null)
        }, 200)
    }

    const downloadTemplate = () => {
        const headers = ALL_COLUMNS.join(',')
        const example = 'driver@example.com,John Doe,555-0123,DL123456,12/31/2025,per_mile,0.50,available,1234'
        const csv = `${headers}\n${example}`
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'driver_import_template.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const validCount = parsedDrivers.filter(d => d._errors.length === 0).length
    const invalidCount = parsedDrivers.filter(d => d._errors.length > 0).length

    if (!isMounted) {
        return (
            trigger || (
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Bulk Import
                </Button>
            )
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Bulk Import
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Bulk Driver Import
                    </DialogTitle>
                    <DialogDescription>
                        Import multiple drivers from a CSV file. New user accounts will be automatically created.
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground mb-4">
                                Upload a CSV file with driver data
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="csv-driver-upload"
                            />
                            <Button
                                type="button"
                                onClick={() => document.getElementById('csv-driver-upload')?.click()}
                            >
                                Choose File
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm">
                                <p className="font-medium">Need a template?</p>
                                <p className="text-muted-foreground text-xs">
                                    Download our CSV template with all columns
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            <p className="font-medium mb-1">Required columns:</p>
                            <p>email, full_name</p>
                            <p className="font-medium mt-2 mb-1">Optional columns:</p>
                            <p>{OPTIONAL_COLUMNS.join(', ')}</p>
                        </div>
                    </div>
                )}

                {step === 'importing' && (
                    <div className="py-12 text-center">
                        <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                        <p className="text-lg font-medium">Importing Drivers...</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Creating user accounts and driver profiles. This may take a moment.
                        </p>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {validCount} Valid
                            </Badge>
                            {invalidCount > 0 && (
                                <Badge variant="destructive" className="gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {invalidCount} Invalid
                                </Badge>
                            )}
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">Row</th>
                                            <th className="p-2 text-left">Name</th>
                                            <th className="p-2 text-left">Email</th>
                                            <th className="p-2 text-left">PIN</th>
                                            <th className="p-2 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedDrivers.map((driver, idx) => (
                                            <tr key={idx} className={driver._errors.length > 0 ? 'bg-status-error-muted' : ''}>
                                                <td className="p-2">{driver._rowIndex}</td>
                                                <td className="p-2">{driver.full_name || '-'}</td>
                                                <td className="p-2">{driver.email || '-'}</td>
                                                <td className="p-2 font-mono">{driver.login_pin ? '••••' : '-'}</td>
                                                <td className="p-2">
                                                    {driver._errors.length > 0 ? (
                                                        <span className="text-status-error">{driver._errors[0]}</span>
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Back
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={validCount === 0}
                            >
                                Import {validCount} Drivers
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'result' && importResult && (
                    <div className="space-y-4">
                        <div className="text-center py-4">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-status-success mb-4" />
                            <h3 className="text-lg font-semibold">Import Complete!</h3>
                            <p className="text-muted-foreground">
                                {importResult.successful} drivers imported successfully
                            </p>
                        </div>

                        {importResult.failed.length > 0 && (
                            <div className="border border-status-error rounded-lg p-3">
                                <p className="text-sm font-medium text-status-error mb-2">
                                    {importResult.failed.length} failed to import:
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    {importResult.failed.slice(0, 5).map((f, idx) => (
                                        <li key={idx}>Email {f.email}: {f.error}</li>
                                    ))}
                                    {importResult.failed.length > 5 && (
                                        <li>...and {importResult.failed.length - 5} more</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleClose}>Done</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
