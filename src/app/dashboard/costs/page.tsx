'use client'

import { useState } from 'react'
import { DollarSign, Fuel, MapPin, Users, Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

export default function CostsPage() {
    // Fuel Estimator State
    const [fuelDistance, setFuelDistance] = useState<number>(100)
    const [fuelEfficiency, setFuelEfficiency] = useState<number>(12)
    const [fuelPrice, setFuelPrice] = useState<number>(1.5)

    // Toll Estimator (placeholder)
    const [tollAmount, setTollAmount] = useState<number>(15)

    // Driver Pay Estimator
    const [paymentType, setPaymentType] = useState<string>('per_mile')
    const [rateAmount, setRateAmount] = useState<number>(0.50)
    const [tripDistance, setTripDistance] = useState<number>(100)
    const [tripDuration, setTripDuration] = useState<number>(120)

    // Calculations
    const fuelCost = fuelEfficiency > 0 ? (fuelDistance / fuelEfficiency) * fuelPrice : 0

    const calculateDriverPay = () => {
        switch (paymentType) {
            case 'per_mile':
                return tripDistance * rateAmount
            case 'per_trip':
                return rateAmount
            case 'hourly':
                return (tripDuration / 60) * rateAmount
            case 'salary':
                return 0 // Fixed salary, not per trip
            default:
                return 0
        }
    }

    const driverPay = calculateDriverPay()
    const totalTripCost = fuelCost + tollAmount + driverPay

    return (
        <div className="flex flex-col gap-6 sm:gap-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cost Management</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                    Estimate and track operational costs including fuel, tolls, and driver payments.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-gradient-to-br from-status-success-muted to-status-success-muted/50 border-status-success/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-status-success flex items-center gap-2">
                            <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
                            Fuel Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">${fuelCost.toFixed(2)}</div>
                        <p className="text-[10px] sm:text-xs text-status-success">{fuelDistance} km @ ${fuelPrice}/L</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-status-info-muted to-status-info-muted/50 border-status-info/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-status-info flex items-center gap-2">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                            Toll Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">${tollAmount.toFixed(2)}</div>
                        <p className="text-[10px] sm:text-xs text-status-info">Estimated tolls</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent-purple-muted to-accent-purple-muted/50 border-accent-purple/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-accent-purple flex items-center gap-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                            Driver Pay
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">${driverPay.toFixed(2)}</div>
                        <p className="text-[10px] sm:text-xs text-accent-purple capitalize">{paymentType.replace('_', ' ')}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent-orange-muted to-accent-orange-muted/50 border-accent-orange/20">
                    <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-accent-orange flex items-center gap-2">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                            Total Trip Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">${totalTripCost.toFixed(2)}</div>
                        <p className="text-[10px] sm:text-xs text-accent-orange">Combined costs</p>
                    </CardContent>
                </Card>
            </div>

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
                            <Label htmlFor="toll" className="text-xs sm:text-sm">Estimated Toll Amount ($)</Label>
                            <Input
                                id="toll"
                                type="number"
                                step="0.01"
                                value={tollAmount}
                                onChange={(e) => setTollAmount(Number(e.target.value))}
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
                            <Select value={paymentType} onValueChange={setPaymentType}>
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
                        {paymentType === 'per_mile' && (
                            <div className="space-y-2">
                                <Label htmlFor="tripDist" className="text-xs sm:text-sm">Trip Distance (km)</Label>
                                <Input
                                    id="tripDist"
                                    type="number"
                                    value={tripDistance}
                                    onChange={(e) => setTripDistance(Number(e.target.value))}
                                />
                            </div>
                        )}
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
                                <span className="text-xl sm:text-2xl font-bold text-accent-purple">${driverPay.toFixed(2)}</span>
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
                            <p className="text-lg sm:text-xl font-bold text-accent-purple">${driverPay.toFixed(2)}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-accent-orange-muted rounded-lg border-2 border-accent-orange/30">
                            <p className="text-xs sm:text-sm font-medium text-accent-orange">TOTAL</p>
                            <p className="text-xl sm:text-2xl font-bold text-accent-orange">${totalTripCost.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <Button className="gap-2">
                            <DollarSign className="h-4 w-4" />
                            Apply to Job
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
