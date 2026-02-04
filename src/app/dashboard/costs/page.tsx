'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Fuel, MapPin, Users, Calculator, Save, History, Check, Loader2, Navigation } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { LocationPicker } from '@/components/ui/LocationPicker'
import {
    useCreateCostEstimate,
    useCostEstimates,
    useVehiclesForCost,
    useDriversForCost,
    useJobsForCost,
    calculateCosts,
    useCostSummary
} from '@/hooks/useCosts'
import { calculateTolls } from '@/lib/services/tollguru'
import { CostEstimateInsert } from '@/types/database'

export default function CostsPage() {
    // Form state
    const [selectedVehicle, setSelectedVehicle] = useState<string>('')
    const [selectedDriver, setSelectedDriver] = useState<string>('')
    const [selectedJob, setSelectedJob] = useState<string>('')

    // Route State for Toll Calculation
    const [origin, setOrigin] = useState<string>('')
    const [destination, setDestination] = useState<string>('')
    const [isCalculatingTolls, setIsCalculatingTolls] = useState(false)

    // Fuel Estimator State
    const [fuelDistance, setFuelDistance] = useState<number>(100)
    const [fuelEfficiency, setFuelEfficiency] = useState<number>(12)
    const [fuelPrice, setFuelPrice] = useState<number>(1.5)

    // Toll Estimator
    const [tollAmount, setTollAmount] = useState<number>(0)
    const [tollNotes, setTollNotes] = useState<string>('')

    // Driver Pay Estimator
    const [paymentType, setPaymentType] = useState<'per_mile' | 'per_trip' | 'hourly' | 'salary'>('per_mile')
    const [rateAmount, setRateAmount] = useState<number>(0.50)
    const [tripDuration, setTripDuration] = useState<number>(120)

    // Save success state
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Fetch data hooks
    const { data: vehicles, isLoading: vehiclesLoading } = useVehiclesForCost()
    const { data: drivers, isLoading: driversLoading } = useDriversForCost()
    const { data: jobs, isLoading: jobsLoading } = useJobsForCost()
    const { data: recentCosts, isLoading: costsLoading } = useCostEstimates({ limit: 5 })
    const { data: monthlySummary } = useCostSummary('month')

    const createCostMutation = useCreateCostEstimate()

    // Auto-populate fuel efficiency when vehicle is selected
    useEffect(() => {
        if (selectedVehicle && vehicles) {
            const vehicle = vehicles.find(v => v.id === selectedVehicle)
            if (vehicle?.fuel_efficiency) {
                setFuelEfficiency(Number(vehicle.fuel_efficiency))
            }
        }
    }, [selectedVehicle, vehicles])

    // Auto-populate driver rate when driver is selected
    useEffect(() => {
        if (selectedDriver && drivers) {
            const driver = drivers.find(d => d.id === selectedDriver)
            if (driver) {
                if (driver.payment_type) {
                    setPaymentType(driver.payment_type as 'per_mile' | 'per_trip' | 'hourly' | 'salary')
                }
                if (driver.rate_amount) {
                    setRateAmount(Number(driver.rate_amount))
                }
            }
        }
    }, [selectedDriver, drivers])

    // Calculations
    const costs = calculateCosts({
        distance: fuelDistance,
        fuelEfficiency,
        fuelPrice,
        tollCost: tollAmount,
        driverPaymentType: paymentType,
        driverRate: rateAmount,
        tripDurationMinutes: tripDuration,
    })

    const { fuelCost, driverCost, totalCost } = costs
    const grandTotal = fuelCost + tollAmount + driverCost

    // Calculate tolls using TollGuru
    const handleCalculateTolls = async () => {
        if (!origin || !destination) return

        setIsCalculatingTolls(true)
        try {
            const result = await calculateTolls(origin, destination)
            if (result) {
                setFuelDistance(Number(result.distance.toFixed(1)))
                setTollAmount(Number(result.tollCost.toFixed(2)))
                setTripDuration(Math.round(result.duration))
                setTollNotes(`Route: ${origin} to ${destination}`)
            }
        } catch (error) {
            console.error('Failed to calculate tolls:', error)
        } finally {
            setIsCalculatingTolls(false)
        }
    }

    // Save cost estimate
    const handleSave = async () => {
        const costData: CostEstimateInsert = {
            job_id: selectedJob === 'none' || !selectedJob ? null : selectedJob,
            vehicle_id: selectedVehicle === 'none' || !selectedVehicle ? null : selectedVehicle,
            driver_id: selectedDriver === 'none' || !selectedDriver ? null : selectedDriver,
            distance_km: fuelDistance,
            fuel_efficiency: fuelEfficiency,
            fuel_price_per_liter: fuelPrice,
            fuel_cost: fuelCost,
            toll_cost: tollAmount,
            toll_notes: tollNotes || null,
            driver_payment_type: paymentType,
            driver_rate: rateAmount,
            driver_cost: driverCost,
            trip_duration_minutes: tripDuration,
            total_cost: grandTotal,
            status: selectedJob ? 'estimate' : 'estimate',
        }

        try {
            await createCostMutation.mutateAsync(costData)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (error) {
            console.error('Failed to save cost estimate:', error)
        }
    }

    const isLoading = vehiclesLoading || driversLoading || jobsLoading

    return (
        <div className="flex flex-col gap-6 sm:gap-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cost Management</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                    Estimate and track operational costs including fuel, tolls, and driver payments.
                </p>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-gradient-to-br from-status-success-muted to-status-success-muted/50 border-status-success/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-status-success flex items-center gap-2">
                            <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
                            Monthly Fuel
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">
                            ${(monthlySummary?.fuelCost || 0).toFixed(2)}
                        </div>
                        <p className="text-[10px] sm:text-xs text-status-success">This month</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-status-info-muted to-status-info-muted/50 border-status-info/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-status-info flex items-center gap-2">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                            Monthly Tolls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">
                            ${(monthlySummary?.tollCost || 0).toFixed(2)}
                        </div>
                        <p className="text-[10px] sm:text-xs text-status-info">This month</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent-purple-muted to-accent-purple-muted/50 border-accent-purple/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-accent-purple flex items-center gap-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                            Monthly Driver Pay
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">
                            ${(monthlySummary?.driverCost || 0).toFixed(2)}
                        </div>
                        <p className="text-[10px] sm:text-xs text-accent-purple">This month</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent-orange-muted to-accent-orange-muted/50 border-accent-orange/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-accent-orange flex items-center gap-2">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                            Monthly Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">
                            ${(monthlySummary?.totalCost || 0).toFixed(2)}
                        </div>
                        <p className="text-[10px] sm:text-xs text-accent-orange">{monthlySummary?.count || 0} estimates</p>
                    </CardContent>
                </Card>
            </div>

            {/* Link to Job/Vehicle/Driver */}
            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Link Cost Estimate</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Optionally link this estimate to a job, vehicle, or driver for tracking
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Job (Optional)</Label>
                            <Select value={selectedJob} onValueChange={setSelectedJob}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a job..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No job</SelectItem>
                                    {jobs?.map((job) => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {job.job_number} - {job.customer_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Vehicle (Optional)</Label>
                            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No vehicle</SelectItem>
                                    {vehicles?.map((vehicle) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                            {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedVehicle && vehicles?.find(v => v.id === selectedVehicle)?.fuel_efficiency && (
                                <p className="text-[10px] text-muted-foreground">
                                    Fuel efficiency auto-filled from vehicle
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Driver (Optional)</Label>
                            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a driver..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No driver</SelectItem>
                                    {drivers?.map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id}>
                                            {driver.profiles?.full_name || 'Unknown'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedDriver && (
                                <p className="text-[10px] text-muted-foreground">
                                    Payment type and rate auto-filled from driver
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estimator Cards */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Fuel Cost Estimator */}
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Fuel className="h-4 w-4 sm:h-5 sm:w-5 text-status-success" />
                            Fuel Cost Estimator
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Calculate fuel cost based on distance and efficiency</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="space-y-2">
                            <Label htmlFor="distance" className="text-xs sm:text-sm">Distance (km)</Label>
                            <Input
                                id="distance"
                                type="number"
                                value={fuelDistance}
                                onChange={(e) => setFuelDistance(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="efficiency" className="text-xs sm:text-sm">Fuel Efficiency (km/L)</Label>
                            <Input
                                id="efficiency"
                                type="number"
                                step="0.1"
                                value={fuelEfficiency}
                                onChange={(e) => setFuelEfficiency(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fuelPrice" className="text-xs sm:text-sm">Fuel Price ($/L)</Label>
                            <Input
                                id="fuelPrice"
                                type="number"
                                step="0.01"
                                value={fuelPrice}
                                onChange={(e) => setFuelPrice(Number(e.target.value))}
                            />
                        </div>
                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs sm:text-sm">Estimated Fuel Cost:</span>
                                <span className="text-xl sm:text-2xl font-bold text-status-success">${fuelCost.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                {(fuelDistance / fuelEfficiency).toFixed(1)} liters required
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Toll Estimator */}
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-status-info" />
                            Toll Cost Estimator
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Enter estimated toll costs for the route</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Route Calculation (Optional)</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <LocationPicker
                                    value={origin}
                                    onChange={(value) => setOrigin(value)}
                                    placeholder="Search origin..."
                                />
                                <LocationPicker
                                    value={destination}
                                    onChange={(value) => setDestination(value)}
                                    placeholder="Search destination..."
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleCalculateTolls}
                                disabled={!origin || !destination || isCalculatingTolls}
                            >
                                {isCalculatingTolls ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Navigation className="h-3 w-3" />
                                )}
                                Calculate Distance & Tolls
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="toll" className="text-xs sm:text-sm">Estimated Toll Amount ($)</Label>
                            <Input
                                id="toll"
                                type="number"
                                step="0.01"
                                value={tollAmount}
                                onChange={(e) => setTollAmount(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tollNotes" className="text-xs sm:text-sm">Notes (Optional)</Label>
                            <Input
                                id="tollNotes"
                                type="text"
                                placeholder="e.g., Highway 401 tolls"
                                value={tollNotes}
                                onChange={(e) => setTollNotes(e.target.value)}
                            />
                        </div>
                        <div className="p-3 sm:p-4 bg-status-info-muted rounded-lg text-xs sm:text-sm text-status-info">
                            <p className="font-medium">Tip:</p>
                            <p>Use toll calculators like TollGuru or check highway authority websites for accurate toll estimates.</p>
                        </div>
                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs sm:text-sm">Total Tolls:</span>
                                <span className="text-xl sm:text-2xl font-bold text-status-info">${tollAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Driver Pay Estimator */}
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent-purple" />
                            Driver Pay Calculator
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Calculate driver earnings based on payment type</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Payment Type</Label>
                            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="per_mile">Per Mile</SelectItem>
                                    <SelectItem value="per_trip">Per Trip</SelectItem>
                                    <SelectItem value="hourly">Hourly</SelectItem>
                                    <SelectItem value="salary">Salary (Fixed)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rate" className="text-xs sm:text-sm">Rate Amount ($)</Label>
                            <Input
                                id="rate"
                                type="number"
                                step="0.01"
                                value={rateAmount}
                                onChange={(e) => setRateAmount(Number(e.target.value))}
                            />
                        </div>
                        {paymentType === 'hourly' && (
                            <div className="space-y-2">
                                <Label htmlFor="duration" className="text-xs sm:text-sm">Trip Duration (minutes)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={tripDuration}
                                    onChange={(e) => setTripDuration(Number(e.target.value))}
                                />
                            </div>
                        )}
                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs sm:text-sm">Driver Earnings:</span>
                                <span className="text-xl sm:text-2xl font-bold text-accent-purple">${driverCost.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Complete Trip Cost Summary */}
            <Card className="border-2 border-dashed">
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                        Complete Trip Cost Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
                        <div className="p-3 sm:p-4 bg-status-success-muted rounded-lg">
                            <p className="text-xs sm:text-sm text-muted-foreground">Fuel</p>
                            <p className="text-lg sm:text-xl font-bold text-status-success">${fuelCost.toFixed(2)}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-status-info-muted rounded-lg">
                            <p className="text-xs sm:text-sm text-muted-foreground">Tolls</p>
                            <p className="text-lg sm:text-xl font-bold text-status-info">${tollAmount.toFixed(2)}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-accent-purple-muted rounded-lg">
                            <p className="text-xs sm:text-sm text-muted-foreground">Driver</p>
                            <p className="text-lg sm:text-xl font-bold text-accent-purple">${driverCost.toFixed(2)}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-accent-orange-muted rounded-lg border-2 border-accent-orange/30">
                            <p className="text-xs sm:text-sm font-medium text-accent-orange">TOTAL</p>
                            <p className="text-xl sm:text-2xl font-bold text-accent-orange">${grandTotal.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                        <Button
                            className="gap-2"
                            onClick={handleSave}
                            disabled={createCostMutation.isPending}
                        >
                            {saveSuccess ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {createCostMutation.isPending ? 'Saving...' : 'Save Estimate'}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Cost Estimates */}
            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <History className="h-4 w-4 sm:h-5 sm:w-5" />
                        Recent Cost Estimates
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    {costsLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : recentCosts && recentCosts.length > 0 ? (
                        <div className="space-y-3">
                            {recentCosts.map((cost) => (
                                <div
                                    key={cost.id}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">
                                                {cost.jobs?.job_number || 'No Job'}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {cost.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {cost.vehicles?.registration_number || 'No Vehicle'} •
                                            {cost.distance_km} km •
                                            {new Date(cost.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-accent-orange">
                                            ${cost.total_cost.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            F: ${cost.fuel_cost.toFixed(0)} | T: ${cost.toll_cost.toFixed(0)} | D: ${cost.driver_cost.toFixed(0)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No cost estimates saved yet</p>
                            <p className="text-xs">Create and save your first estimate above</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
