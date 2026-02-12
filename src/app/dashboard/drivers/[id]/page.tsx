'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Edit, Trash2, User, Phone, CreditCard, Truck, IdCard, Calendar, Mail } from 'lucide-react'
import { useDriver, useDeleteDriver, useUpdateDriver } from '@/hooks/useDrivers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DriverForm } from '@/components/drivers/DriverForm'
import { toast } from 'sonner'
import { DriverInsert, Profile } from '@/types/database'
import { updateDriver } from '../actions'
import { useQueryClient } from '@tanstack/react-query'
import { driverKeys } from '@/hooks/useDrivers'

export default function DriverDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [isEditing, setIsEditing] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // Use the single driver hook - fetches only this driver, uses cache if available
    const { data: driver, isLoading, error } = useDriver(id)
    const deleteMutation = useDeleteDriver()
    const queryClient = useQueryClient()
    // const updateMutation = useUpdateDriver() // No longer using client side update for main form to support PIN sync

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this driver?')) return
        await deleteMutation.mutateAsync(id)
        router.push('/dashboard/drivers')
    }

    const handleUpdate = async (data: { driver: DriverInsert; profile?: Partial<Profile> }) => {
        setIsUpdating(true)
        try {
            const result = await updateDriver(id, {
                ...data.driver,
                login_pin: data.driver.login_pin || undefined
            }, {
                email: data.profile?.email || undefined,
                full_name: data.profile?.full_name || undefined,
                phone: data.profile?.phone || undefined
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            // Invalidate cache
            queryClient.invalidateQueries({ queryKey: driverKeys.detail(id) })
            queryClient.invalidateQueries({ queryKey: driverKeys.lists() })

            setIsEditing(false)
            toast.success('Driver updated successfully')
        } catch (error: any) {
            console.error(error)
            // Check for duplicate PIN error (already handled in action but safety check)
            if (error?.message?.includes('PIN')) {
                toast.error(error.message)
            } else {
                toast.error('Failed to update driver: ' + (error.message || 'Unknown error'))
            }
        } finally {
            setIsUpdating(false)
        }
    }

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'available': return 'badge-success'
            case 'on_trip': return 'badge-info'
            case 'off_duty': return 'badge-neutral'
            default: return 'badge-neutral'
        }
    }

    const getPaymentLabel = (type: string | null) => {
        switch (type) {
            case 'per_mile': return 'Per Mile'
            case 'per_trip': return 'Per Trip'
            case 'hourly': return 'Hourly'
            case 'salary': return 'Salary'
            default: return 'Not configured'
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                    </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-[100px] rounded-xl" />
                    ))}
                </div>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                </div>
            </div>
        )
    }

    if (error || !driver) {
        return <div className="p-8 text-center">Driver not found</div>
    }

    const profile = driver.profiles
    const assignedVehicle = driver.vehicles

    // Format license expiry
    const licenseExpiry = driver.license_expiry
        ? new Date(driver.license_expiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Not set'

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Avatar */}
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name || 'Driver'}
                                className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-primary to-accent-purple rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg sm:text-2xl shrink-0">
                                {profile?.full_name?.charAt(0) || 'D'}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{profile?.full_name || 'Unknown Driver'}</h1>
                                <Badge className={`capitalize border ${getStatusBadge(driver.status)}`}>
                                    {driver.status?.replace('_', ' ') || 'Unknown'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm flex-wrap">
                                <span className="truncate max-w-[200px]">{profile?.email}</span>
                                {profile?.phone && (
                                    <>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="hidden sm:inline">{profile.phone}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-10 sm:ml-0">
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Edit</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Driver</DialogTitle>
                            </DialogHeader>
                            <DriverForm
                                initialData={{
                                    driver: driver,
                                    profile: driver.profiles || undefined
                                }}
                                onSubmit={handleUpdate}
                                isSubmitting={isUpdating} // Connected to local state
                            />
                        </DialogContent>
                    </Dialog>
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Payment Type</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-lg sm:text-2xl font-bold">{getPaymentLabel(driver.payment_type)}</div>
                        <p className="text-xs text-muted-foreground">
                            Rate: ${Number(driver.rate_amount || 0).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">License</CardTitle>
                        <IdCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-sm sm:text-lg font-bold font-mono truncate">{driver.license_number || 'Not provided'}</div>
                        <p className="text-xs text-muted-foreground">Exp: {licenseExpiry}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Assigned Vehicle</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        {assignedVehicle ? (
                            <>
                                <div className="text-sm sm:text-lg font-bold">{assignedVehicle.make} {assignedVehicle.model}</div>
                                <p className="text-xs text-muted-foreground">{assignedVehicle.license_plate}</p>
                            </>
                        ) : (
                            <div className="text-sm sm:text-lg font-medium text-muted-foreground">No vehicle assigned</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Earnings (Month)</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-xl sm:text-2xl font-bold">$0.00</div>
                        <p className="text-xs text-muted-foreground">No completed trips</p>
                    </CardContent>
                </Card>
            </div>

            {/* Details Section */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                <Card className="h-full">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-info-muted flex items-center justify-center shrink-0">
                                <Mail className="h-4 w-4 text-status-info" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
                                <p className="font-medium text-sm truncate">{profile?.email || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-success-muted flex items-center justify-center shrink-0">
                                <Phone className="h-4 w-4 text-status-success" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-muted-foreground">Phone</p>
                                <p className="font-medium text-sm">{profile?.phone || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-purple-muted flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-accent-purple" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-muted-foreground">Role</p>
                                <p className="font-medium text-sm capitalize">{profile?.role || 'Driver'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Recent Trips</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
                        <div className="text-center">
                            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No trips recorded yet</p>
                            <Button variant="outline" size="sm" className="mt-4">
                                Assign a Job
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
