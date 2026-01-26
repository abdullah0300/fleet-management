'use client'

import { useRouter } from 'next/navigation'
import { User, Phone, CreditCard, Truck, IdCard, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DriverCardProps {
    driver: any
    onEdit?: (driver: any) => void
}

export function DriverCard({ driver, onEdit }: DriverCardProps) {
    const router = useRouter()

    // Design system semantic status styles
    const getStatusStyles = (status: string | null) => {
        switch (status) {
            case 'available': return { label: 'Available', className: 'badge-success' }
            case 'on_trip': return { label: 'On Trip', className: 'badge-info' }
            case 'off_duty': return { label: 'Off Duty', className: 'badge-neutral' }
            default: return { label: 'Unknown', className: 'badge-neutral' }
        }
    }

    const getPaymentLabel = (type: string | null) => {
        switch (type) {
            case 'per_mile': return 'Per Mile'
            case 'per_trip': return 'Per Trip'
            case 'hourly': return 'Hourly'
            case 'salary': return 'Salary'
            default: return 'N/A'
        }
    }

    const statusStyle = getStatusStyles(driver.status)
    const profile = driver.profiles
    const assignedVehicle = driver.vehicles

    // Format license expiry
    const licenseExpiry = driver.license_expiry
        ? new Date(driver.license_expiry).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Not set'

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-all border-none shadow-sm flex flex-col h-full bg-card group rounded-xl">
            <div className="p-4 sm:p-5 flex-1 space-y-3 sm:space-y-4">
                {/* Header: Avatar & Name */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Avatar - use first letter or avatar_url */}
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name || 'Driver'}
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-primary to-accent-purple rounded-full flex items-center justify-center text-primary-foreground font-bold text-base sm:text-lg">
                                {profile?.full_name?.charAt(0) || 'D'}
                            </div>
                        )}
                        <div>
                            <div className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded mb-1 w-fit border ${statusStyle.className}`}>
                                {statusStyle.label}
                            </div>
                            <h3 className="font-bold text-foreground leading-tight text-sm sm:text-base">
                                {profile?.full_name || 'Unknown Driver'}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{profile?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Info Rows */}
                <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                    {/* Phone */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <Phone className="h-4 w-4 text-status-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Phone</p>
                            <p className="font-medium text-foreground text-xs truncate">
                                {profile?.phone || 'Not provided'}
                            </p>
                        </div>
                    </div>

                    {/* License */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <IdCard className="h-4 w-4 text-status-info" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">License</p>
                            <p className="font-medium text-foreground text-xs truncate">
                                {driver.license_number || 'Not provided'}
                            </p>
                        </div>
                    </div>

                    {/* License Expiry */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <Calendar className="h-4 w-4 text-accent-orange" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase">License Expiry</p>
                            <p className="font-medium text-foreground text-xs">
                                {licenseExpiry}
                            </p>
                        </div>
                    </div>

                    {/* Payment Type */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <CreditCard className="h-4 w-4 text-accent-purple" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Payment</p>
                            <p className="font-medium text-foreground text-xs">
                                {getPaymentLabel(driver.payment_type)} - ${Number(driver.rate_amount || 0).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Assigned Vehicle */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <Truck className="h-4 w-4 text-accent-teal" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Assigned Vehicle</p>
                            <p className="font-medium text-foreground text-xs truncate">
                                {assignedVehicle
                                    ? `${assignedVehicle.make} ${assignedVehicle.model}`
                                    : 'None'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-2 sm:p-3 bg-muted/50 border-t flex gap-2">
                <Button
                    variant="ghost"
                    className="flex-1 text-xs h-8 hover:bg-card hover:shadow-sm border border-transparent hover:border-border"
                    onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/drivers/${driver.id}`)
                    }}
                >
                    View Details
                </Button>
                <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
                    onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/jobs/new?driver_id=${driver.id}`)
                    }}
                >
                    Assign Trip
                </Button>
            </div>
        </Card>
    )
}
