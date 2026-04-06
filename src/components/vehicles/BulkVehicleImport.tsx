'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from 'lucide-react'
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
import { useBulkCreateVehicles } from '@/hooks/useVehicles'
import { VehicleInsert } from '@/types/database'

interface ParsedVehicle extends VehicleInsert {
    _rowIndex: number
    _errors: string[]
}

interface BulkVehicleImportProps {
    trigger?: React.ReactNode
}

const REQUIRED_COLUMNS = ['license_plate', 'make', 'model']
const OPTIONAL_COLUMNS = ['year', 'vehicle_type', 'fuel_type', 'fuel_efficiency', 'status', 'odometer_reading', 'vin_number', 'rfid_tag']
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

const VALID_FUEL_TYPES = ['diesel', 'petrol', 'electric', 'hybrid']
const VALID_STATUSES = ['available', 'in_use', 'maintenance', 'inactive']

export function BulkVehicleImport({ trigger }: BulkVehicleImportProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
    const [parsedVehicles, setParsedVehicles] = useState<ParsedVehicle[]>([])
    const [importResult, setImportResult] = useState<{
        successful: number
        failed: { index: number; error: string }[]
    } | null>(null)

    const bulkCreate = useBulkCreateVehicles()

    const parseCSV = (text: string): ParsedVehicle[] => {
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

        const seenPlates = new Set<string>()
        const vehicles: ParsedVehicle[] = []

        result.data.forEach((row, i) => {
            const errors: string[] = []
            const rowIndex = i + 2 // 1-based + header row

            const vehicle: ParsedVehicle = {
                _rowIndex: rowIndex,
                _errors: errors,
                license_plate: '',
                make: '',
                model: '',
            }

            // Required fields
            const licensePlate = row['license_plate']?.trim() || ''
            const make = row['make']?.trim() || ''
            const model = row['model']?.trim() || ''

            if (!licensePlate) {
                errors.push('license_plate is required')
            } else if (seenPlates.has(licensePlate.toUpperCase())) {
                errors.push(`Duplicate license plate: ${licensePlate}`)
            } else {
                seenPlates.add(licensePlate.toUpperCase())
                vehicle.license_plate = licensePlate
            }

            if (!make) {
                errors.push('make is required')
            } else {
                vehicle.make = make
            }

            if (!model) {
                errors.push('model is required')
            } else {
                vehicle.model = model
            }

            // Optional fields
            const yearStr = row['year']?.trim()
            if (yearStr) {
                const year = parseInt(yearStr)
                if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
                    errors.push('Invalid year')
                } else {
                    vehicle.year = year
                }
            }

            const fuelEffStr = row['fuel_efficiency']?.trim()
            if (fuelEffStr) {
                const efficiency = parseFloat(fuelEffStr)
                if (isNaN(efficiency) || efficiency <= 0) {
                    errors.push('Invalid fuel efficiency')
                } else {
                    vehicle.fuel_efficiency = efficiency
                }
            }

            const odomStr = row['odometer_reading']?.trim()
            if (odomStr) {
                const reading = parseInt(odomStr)
                if (isNaN(reading) || reading < 0) {
                    errors.push('Invalid odometer reading')
                } else {
                    vehicle.odometer_reading = reading
                }
            }

            const fuelType = row['fuel_type']?.trim().toLowerCase()
            if (fuelType) {
                if (!VALID_FUEL_TYPES.includes(fuelType)) {
                    errors.push(`Invalid fuel type. Use: ${VALID_FUEL_TYPES.join(', ')}`)
                } else {
                    vehicle.fuel_type = fuelType as 'diesel' | 'petrol' | 'electric' | 'hybrid'
                }
            }

            const status = row['status']?.trim().toLowerCase()
            if (status) {
                if (!VALID_STATUSES.includes(status)) {
                    errors.push(`Invalid status. Use: ${VALID_STATUSES.join(', ')}`)
                } else {
                    vehicle.status = status as 'available' | 'in_use' | 'maintenance' | 'inactive'
                }
            }

            const vehicleType = row['vehicle_type']?.trim()
            if (vehicleType) vehicle.vehicle_type = vehicleType

            const vin = row['vin_number']?.trim()
            if (vin) vehicle.vin_number = vin

            const rfid = row['rfid_tag']?.trim()
            if (rfid) vehicle.rfid_tag = rfid

            vehicles.push(vehicle)
        })

        return vehicles
    }

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string
                const vehicles = parseCSV(text)
                if (vehicles.length === 0) {
                    alert('No data rows found in CSV')
                    return
                }
                setParsedVehicles(vehicles)
                setStep('preview')
            } catch (error) {
                alert(error instanceof Error ? error.message : 'Failed to parse CSV')
            }
        }
        reader.readAsText(file)
    }, [])

    const handleImport = async () => {
        const validVehicles = parsedVehicles
            .filter(v => v._errors.length === 0)
            .map(({ _rowIndex, _errors, ...vehicle }) => vehicle as VehicleInsert)

        if (validVehicles.length === 0) {
            alert('No valid vehicles to import')
            return
        }

        try {
            const result = await bulkCreate.mutateAsync(validVehicles)
            setImportResult({
                successful: result.successful.length,
                failed: result.failed.map(f => ({ index: f.index, error: f.error })),
            })
            setStep('result')
        } catch (error) {
            alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        // Reset state after animation
        setTimeout(() => {
            setStep('upload')
            setParsedVehicles([])
            setImportResult(null)
        }, 200)
    }

    const downloadTemplate = () => {
        const headers = ALL_COLUMNS.join(',')
        const example = 'ABC-1234,Toyota,Camry,2023,sedan,petrol,12.5,available,50000,1HGBH41JXMN109186,RFID-001'
        const csv = `${headers}\n${example}`
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'vehicle_import_template.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const validCount = parsedVehicles.filter(v => v._errors.length === 0).length
    const invalidCount = parsedVehicles.filter(v => v._errors.length > 0).length

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
                        Bulk Vehicle Import
                    </DialogTitle>
                    <DialogDescription>
                        Import multiple vehicles from a CSV file
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground mb-4">
                                Upload a CSV file with vehicle data
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="csv-upload"
                            />
                            <Button
                                type="button"
                                onClick={() => document.getElementById('csv-upload')?.click()}
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
                            <p>{REQUIRED_COLUMNS.join(', ')}</p>
                            <p className="font-medium mt-2 mb-1">Optional columns:</p>
                            <p>{OPTIONAL_COLUMNS.join(', ')}</p>
                        </div>
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
                                            <th className="p-2 text-left">License Plate</th>
                                            <th className="p-2 text-left">Make</th>
                                            <th className="p-2 text-left">Model</th>
                                            <th className="p-2 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedVehicles.map((vehicle, idx) => (
                                            <tr key={idx} className={vehicle._errors.length > 0 ? 'bg-status-error-muted' : ''}>
                                                <td className="p-2">{vehicle._rowIndex}</td>
                                                <td className="p-2">{vehicle.license_plate}</td>
                                                <td className="p-2">{vehicle.make}</td>
                                                <td className="p-2">{vehicle.model}</td>
                                                <td className="p-2">
                                                    {vehicle._errors.length > 0 ? (
                                                        <span className="text-status-error">{vehicle._errors[0]}</span>
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
                                disabled={validCount === 0 || bulkCreate.isPending}
                            >
                                {bulkCreate.isPending ? 'Importing...' : `Import ${validCount} Vehicles`}
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
                                {importResult.successful} vehicles imported successfully
                            </p>
                        </div>

                        {importResult.failed.length > 0 && (
                            <div className="border border-status-error rounded-lg p-3">
                                <p className="text-sm font-medium text-status-error mb-2">
                                    {importResult.failed.length} failed to import:
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    {importResult.failed.slice(0, 5).map((f, idx) => (
                                        <li key={idx}>Row {f.index + 1}: {f.error}</li>
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
