'use client'

import { useState, useCallback, useEffect } from 'react'
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
        const lines = text.trim().split('\n')
        if (lines.length < 2) return []

        // Parse header
        const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))

        // Validate header has required columns
        const missingRequired = REQUIRED_COLUMNS.filter(col => !header.includes(col))
        if (missingRequired.length > 0) {
            throw new Error(`Missing required columns: ${missingRequired.join(', ')}`)
        }

        // Parse rows
        const drivers: ParsedDriver[] = []
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue // Skip empty lines

            const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
            const errors: string[] = []

            const driver: ParsedDriver = {
                _rowIndex: i,
                _errors: errors,
                email: '',
                full_name: '',
            }

            header.forEach((col, idx) => {
                const value = values[idx]?.trim() || ''

                if (col === 'email') {
                    if (!value) {
                        errors.push('Email is required')
                    } else {
                        // Basic email validation
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                        if (!emailRegex.test(value)) {
                            errors.push('Invalid email format')
                        } else {
                            driver.email = value.toLowerCase()
                        }
                    }
                } else if (col === 'full_name') {
                    if (!value) {
                        errors.push('Full name is required')
                    } else {
                        driver.full_name = value
                    }
                } else if (col === 'phone') {
                    driver.phone = value
                } else if (col === 'rate_amount' && value) {
                    const rate = parseFloat(value)
                    if (isNaN(rate) || rate < 0) {
                        errors.push('Invalid rate amount')
                    } else {
                        driver.rate_amount = rate
                    }
                } else if (col === 'payment_type' && value) {
                    if (!VALID_PAYMENT_TYPES.includes(value.toLowerCase())) {
                        errors.push(`Invalid payment type. Use: ${VALID_PAYMENT_TYPES.join(', ')}`)
                    } else {
                        driver.payment_type = value.toLowerCase() as 'per_mile' | 'per_trip' | 'hourly' | 'salary'
                    }
                } else if (col === 'status' && value) {
                    if (!VALID_STATUSES.includes(value.toLowerCase())) {
                        errors.push(`Invalid status. Use: ${VALID_STATUSES.join(', ')}`)
                    } else {
                        driver.status = value.toLowerCase() as 'available' | 'on_trip' | 'off_duty'
                    }
                } else if (col === 'license_number') {
                    driver.license_number = value
                } else if (col === 'license_expiry' && value) {
                    // Accept MM/DD/YYYY or YYYY-MM-DD
                    const usDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
                    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
                    const usMatch = value.match(usDateRegex)
                    if (usMatch) {
                        // Convert MM/DD/YYYY to YYYY-MM-DD for storage
                        const [, month, day, year] = usMatch
                        driver.license_expiry = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                    } else if (isoDateRegex.test(value)) {
                        driver.license_expiry = value
                    } else {
                        errors.push('Invalid license expiry date (use MM/DD/YYYY format)')
                    }
                } else if (col === 'login_pin' && value) {
                    const pinRegex = /^\d{4,6}$/
                    if (!pinRegex.test(value)) {
                        errors.push('Invalid PIN (must be 4-6 digits)')
                    } else {
                        driver.login_pin = value
                    }
                }
            })

            drivers.push(driver)
        }

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
                        Import multiple drivers from a CSV file. New users will be automatically created.
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
                                                <td className="p-2 font-mono">{driver.login_pin || '-'}</td>
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
