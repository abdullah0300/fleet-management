'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Building2, Save, Upload, Loader2, MapPin, Mail, Phone, Settings2, Truck, DollarSign, Users, Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import { useCurrentUser, useHasPermission } from '@/hooks/useCurrentUser'
import { AccessDenied } from '@/components/auth/PermissionGate'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember, useResetTeamMemberPassword } from '@/hooks/useTeam'
import { Profile } from '@/types/database'

export default function SettingsPage() {
    const { data: user, isLoading: isUserLoading } = useCurrentUser()
    const canManageSettings = useHasPermission('manage:settings')
    const [company, setCompany] = useState<any>(null)
    const [teamMembers, setTeamMembers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()

    // Form states
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [logoUrl, setLogoUrl] = useState('')

    // Settings states
    const [defaultBillingType, setDefaultBillingType] = useState('flat_rate')
    const [defaultPriority, setDefaultPriority] = useState('normal')
    const [defaultFuelType, setDefaultFuelType] = useState('diesel')
    const [defaultPaymentType, setDefaultPaymentType] = useState('per_mile')
    const [defaultDriverRate, setDefaultDriverRate] = useState('0.60')
    const [defaultFuelPrice, setDefaultFuelPrice] = useState('4.00')
    const [defaultFuelEfficiency, setDefaultFuelEfficiency] = useState('6.5')
    const [metricSystem, setMetricSystem] = useState<'imperial' | 'metric'>('imperial')

    const [isUploadingLogo, setIsUploadingLogo] = useState(false)

    useEffect(() => {
        async function fetchCompany() {
            if (!user?.company_id) {
                setIsLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', user.company_id)
                    .single()

                if (error) throw error

                setCompany(data)
                setName(data.name || '')
                setEmail(data.email || '')
                setPhone(data.phone || '')
                setAddress(data.address || '')
                setLogoUrl(data.logo_url || '')

                // Load settings defaults
                const s = data.settings || {}
                setDefaultBillingType(s.defaultBillingType || 'flat_rate')
                setDefaultPriority(s.defaultPriority || 'normal')
                setDefaultFuelType(s.defaultFuelType || 'diesel')
                setDefaultPaymentType(s.defaultPaymentType || 'per_mile')
                setDefaultDriverRate(s.defaultDriverRate || '0.60')
                setDefaultFuelPrice(s.defaultFuelPrice || '4.00')
                setDefaultFuelEfficiency(s.defaultFuelEfficiency || '6.5')
                setMetricSystem(s.metricSystem || 'imperial')

                // Fetch team members
                const { data: members, error: membersError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('company_id', user.company_id)
                    .order('created_at', { ascending: false })

                if (!membersError && members) {
                    setTeamMembers(members)
                }

            } catch (error) {
                console.error('Error fetching company:', error)
                toast.error('Failed to load company details')
            } finally {
                setIsLoading(false)
            }
        }

        if (!isUserLoading) {
            fetchCompany()
        }
    }, [user, isUserLoading, supabase])

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0]
            if (!file || !company?.id) return

            setIsUploadingLogo(true)

            // Basic validation
            if (file.size > 2 * 1024 * 1024) {
                toast.error('File must be less than 2MB')
                return
            }
            if (!file.type.startsWith('image/')) {
                toast.error('File must be an image')
                return
            }

            const fileExt = file.name.split('.').pop()
            const fileName = `${company.id}-${Math.random()}.${fileExt}`
            const filePath = `logos/${fileName}`

            // Upload the file to public logo bucket
            const { error: uploadError } = await supabase.storage
                .from('company-logos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('company-logos')
                .getPublicUrl(filePath)

            // Update the local state
            setLogoUrl(publicUrl)

            // Also instantly save it to the DB so user doesn't have to click save settings separately
            await supabase
                .from('companies')
                .update({ logo_url: publicUrl })
                .eq('id', company.id)

            toast.success('Logo uploaded successfully')
        } catch (error) {
            console.error('Error uploading logo:', error)
            toast.error('Failed to upload logo')
        } finally {
            setIsUploadingLogo(false)
        }
    }

    const handleSave = async () => {
        if (!company?.id) return

        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('companies')
                .update({
                    name,
                    email,
                    phone,
                    address,
                    settings: {
                        defaultBillingType,
                        defaultPriority,
                        defaultFuelType,
                        defaultPaymentType,
                        defaultDriverRate,
                        defaultFuelPrice,
                        defaultFuelEfficiency,
                        metricSystem
                    }
                })
                .eq('id', company.id)

            if (error) throw error
            toast.success('Company profile updated successfully')
        } catch (error) {
            console.error('Error updating company:', error)
            toast.error('Failed to update company details')
        } finally {
            setIsSaving(false)
        }
    }

    if (isUserLoading || isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!canManageSettings && !user?.is_platform_admin) {
        return <AccessDenied message="You don't have permission to access settings." />
    }

    if (!company && !user?.is_platform_admin) {
        return (
            <div className="p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Company Profile</CardTitle>
                        <CardDescription>No company profile found for your account.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and company preferences.</p>
            </div>

            <Tabs defaultValue="company" className="w-full">
                <TabsList className="grid w-full max-w-4xl grid-cols-3 md:grid-cols-6 h-auto md:h-12 p-1 gap-1">
                    <TabsTrigger value="company" className="h-full">Profile</TabsTrigger>
                    <TabsTrigger value="jobs" className="h-full">Jobs</TabsTrigger>
                    <TabsTrigger value="vehicles" className="h-full">Fleet</TabsTrigger>
                    <TabsTrigger value="costing" className="h-full">Cost Engine</TabsTrigger>
                    <TabsTrigger value="team" className="h-full">Team</TabsTrigger>
                    <TabsTrigger value="account" className="h-full">My Account</TabsTrigger>
                </TabsList>

                {/* JOBS DEFAULTS TAB */}
                <TabsContent value="jobs" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5" />
                                Job Defaults
                            </CardTitle>
                            <CardDescription>
                                Set standard defaults to pre-fill when Dispatchers create new jobs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Default Billing Type</Label>
                                    <Select value={defaultBillingType} onValueChange={setDefaultBillingType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select billing type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="flat_rate">Flat Rate</SelectItem>
                                            <SelectItem value="per_mile">Per Mile</SelectItem>
                                            <SelectItem value="per_weight">Per Weight</SelectItem>
                                            <SelectItem value="hourly">Hourly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Standard pricing model for external customer jobs.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Default Job Priority</Label>
                                    <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end border-t pt-6">
                                <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Job Defaults
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FLEET & DRIVER DEFAULTS TAB */}
                <TabsContent value="vehicles" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Fleet & Driver Defaults
                            </CardTitle>
                            <CardDescription>
                                Set base defaults for vehicles and drivers to speed up onboarding.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Default Fuel Type</Label>
                                    <Select value={defaultFuelType} onValueChange={setDefaultFuelType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select fuel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="diesel">Diesel</SelectItem>
                                            <SelectItem value="petrol">Petrol</SelectItem>
                                            <SelectItem value="electric">Electric</SelectItem>
                                            <SelectItem value="hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Standard fuel type when adding a new vehicle.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Default Driver Payment Model</Label>
                                    <Select value={defaultPaymentType} onValueChange={setDefaultPaymentType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="per_mile">Per Mile</SelectItem>
                                            <SelectItem value="per_trip">Per Trip</SelectItem>
                                            <SelectItem value="hourly">Hourly</SelectItem>
                                            <SelectItem value="salary">Salary</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Standard Driver Pay Rate</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={defaultDriverRate}
                                            onChange={(e) => setDefaultDriverRate(e.target.value)}
                                            className="pl-9"
                                            placeholder="0.60"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Standard metric (e.g., $0.60 per mile, $25 per hour).</p>
                                </div>
                            </div>

                            <div className="flex justify-end border-t pt-6">
                                <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Fleet Defaults
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Maintenance Alerts Card */}
                    <MaintenanceAlertsSettings company={company} onSave={handleSave} isSaving={isSaving} />
                </TabsContent>

                {/* COST ENGINE DEFAULTS TAB */}
                <TabsContent value="costing" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Cost Engine Defaults
                            </CardTitle>
                            <CardDescription>
                                Set base variables used to automatically calculate trip and job estimate costs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Default Fuel Price (per unit)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={defaultFuelPrice}
                                            onChange={(e) => setDefaultFuelPrice(e.target.value)}
                                            className="pl-9"
                                            placeholder="4.00"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Standard fallback price per Gallon/Liter.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Fleet Average Fuel Efficiency</Label>
                                    <div className="relative">
                                        <Truck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={defaultFuelEfficiency}
                                            onChange={(e) => setDefaultFuelEfficiency(e.target.value)}
                                            className="pl-9"
                                            placeholder="6.5"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Fallback MPG/KPL if the vehicle's efficiency is unknown.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>System Measurement Metric</Label>
                                    <Select value={metricSystem} onValueChange={(value) => setMetricSystem(value as "imperial" | "metric")}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select metric" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="imperial">Imperial (Miles / Gallons)</SelectItem>
                                            <SelectItem value="metric">Metric (KM / Liters)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Affects odometers and route calculations.</p>
                                </div>
                            </div>

                            <div className="flex justify-end border-t pt-6">
                                <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Cost Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TEAM MEMBERS TAB */}
                <TabsContent value="team" className="mt-6">
                    <TeamManagement currentUser={user} />
                </TabsContent>

                {/* NOTIFICATIONS TAB is part of the existing tabs — inject alerts card into costing tab below */}

                {/* COMPANY PROFILE TAB */}
                <TabsContent value="company" className="mt-6">
                    {user?.is_platform_admin ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Platform Admin</CardTitle>
                                <CardDescription>
                                    As a platform admin, you do not have a specific company profile.
                                    Use the "Companies" tab in the sidebar to manage all tenant companies.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-muted/50">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Company Logo" className="h-full w-full object-contain rounded-xl p-2" />
                                        ) : (
                                            <Building2 className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">{company?.name || 'Your Company'}</CardTitle>
                                        <CardDescription>Update your company's public information and styling.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Basic Info Section */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="companyName"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="pl-9"
                                                placeholder="e.g. Acme Logistics"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="companyEmail">Contact Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="companyEmail"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-9"
                                                placeholder="billing@acme.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="companyPhone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="companyPhone"
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="pl-9"
                                                placeholder="(555) 123-4567"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t pt-6">
                                    <Label htmlFor="companyAddress">Headquarters Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="companyAddress"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="pl-9"
                                            placeholder="123 Logistics Blvd, Suite 100, City, State ZIP"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-6">
                                    <div>
                                        <h3 className="text-sm font-medium leading-none mb-1">Company Logo</h3>
                                        <p className="text-sm text-muted-foreground">This logo will be displayed on manifests, invoices, and the sidebar.</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="logo-upload"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                                onChange={handleLogoUpload}
                                                disabled={isUploadingLogo || isSaving}
                                            />
                                            <Button variant="outline" type="button" className="gap-2 pointer-events-none" disabled={isUploadingLogo}>
                                                {isUploadingLogo ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4" />
                                                )}
                                                {isUploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Recommended: Square PNG up to 2MB.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end border-t pt-6">
                                    <Button onClick={handleSave} disabled={isSaving || !name.trim()} className="gap-2 bg-primary hover:bg-primary/90">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* MY ACCOUNT TAB */}
                <TabsContent value="account" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Account</CardTitle>
                            <CardDescription>Manage your personal profile and preferences.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={user?.full_name || ''} readOnly className="bg-muted cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={user?.email || ''} readOnly className="bg-muted cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Input value={(user?.role || '').replace('_', ' ').toUpperCase()} readOnly className="bg-muted cursor-not-allowed" />
                            </div>
                            <p className="text-sm text-muted-foreground pt-4 flex gap-2 items-center">
                                To update your personal details, please contact your administrator.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ─── Role Badge Helper ────────────────────────────────────────────────────────

function getRoleBadgeClass(role: string) {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200'
        case 'fleet_manager': return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'dispatcher': return 'bg-green-100 text-green-800 border-green-200'
        case 'accountant': return 'bg-amber-100 text-amber-800 border-amber-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
}

// ─── Maintenance Alerts Settings Component ────────────────────────────────────

function MaintenanceAlertsSettings({
    company,
    onSave,
    isSaving,
}: {
    company: any
    onSave: () => void
    isSaving: boolean
}) {
    const supabase = createClient()
    const settings = company?.settings as Record<string, any> | null
    const [enabled, setEnabled] = useState<boolean>(settings?.maintenanceAlerts?.enabled !== false)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<string | null>(null)

    const handleToggle = async (val: boolean) => {
        setEnabled(val)
        if (!company?.id) return
        const newSettings = {
            ...(settings || {}),
            maintenanceAlerts: { ...(settings?.maintenanceAlerts || {}), enabled: val },
        }
        await supabase.from('companies').update({ settings: newSettings }).eq('id', company.id)
    }

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            const res = await fetch('/api/cron/maintenance-alerts')
            const data = await res.json()
            if (res.ok) {
                setTestResult(
                    `✅ Ran successfully — ${data.programs_checked} programs checked, ` +
                    `${data.overdue_records + data.due_soon_records} records flagged, ` +
                    `${data.emails_sent} email${data.emails_sent !== 1 ? 's' : ''} sent`
                )
            } else {
                setTestResult(`❌ Error: ${data.error || 'Unknown error'}`)
            }
        } catch (e: any) {
            setTestResult(`❌ Failed: ${e.message}`)
        } finally {
            setTesting(false)
        }
    }

    return (
        <Card className="mt-4">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <span className="text-lg">🔔</span> Maintenance Email Alerts
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Daily email digest sent at 8:00 AM UTC to all admins and fleet managers
                            when vehicles are overdue or due within 7 days / 500 miles.
                        </CardDescription>
                    </div>
                    <button
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => handleToggle(!enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                    <p className="font-medium text-foreground">How it works</p>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside text-xs">
                        <li>Runs automatically every day at 8:00 AM UTC via Vercel Cron</li>
                        <li>Checks both date-based and odometer-based maintenance schedules</li>
                        <li>Sends one email digest per company — no per-vehicle spam</li>
                        <li>Requires <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> in Vercel env variables to send emails</li>
                        <li>In-app notifications work regardless of email setup</li>
                    </ul>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTest}
                        disabled={testing}
                        className="gap-2"
                    >
                        {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>▶</span>}
                        {testing ? 'Running...' : 'Test Alerts Now'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Runs the check immediately and shows what would be alerted.
                    </p>
                </div>

                {testResult && (
                    <div className={`rounded-lg border p-3 text-sm ${testResult.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {testResult}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Team Management Component ────────────────────────────────────────────────

function TeamManagement({ currentUser }: { currentUser: Profile | null | undefined }) {
    const { data: members = [], isLoading } = useTeamMembers()
    const createMutation = useCreateTeamMember()
    const updateMutation = useUpdateTeamMember()
    const deleteMutation = useDeleteTeamMember()
    const resetPasswordMutation = useResetTeamMemberPassword()

    const canManage = currentUser?.role === 'admin' || currentUser?.role === 'fleet_manager' || currentUser?.is_platform_admin

    // Dialog states
    const [addOpen, setAddOpen] = useState(false)
    const [editMember, setEditMember] = useState<Profile | null>(null)
    const [resetMember, setResetMember] = useState<Profile | null>(null)
    const [deleteMemberTarget, setDeleteMemberTarget] = useState<Profile | null>(null)

    // Add form state
    const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '', role: 'dispatcher' as 'fleet_manager' | 'dispatcher' | 'accountant', phone: '' })
    const [addErrors, setAddErrors] = useState<Record<string, string>>({})

    // Edit form state
    const [editForm, setEditForm] = useState({ full_name: '', role: '', phone: '' })

    // Reset password form state
    const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' })
    const [resetErrors, setResetErrors] = useState<Record<string, string>>({})

    // Populate edit form when editMember changes
    useEffect(() => {
        if (editMember) {
            setEditForm({
                full_name: editMember.full_name || '',
                role: editMember.role || '',
                phone: editMember.phone || '',
            })
        }
    }, [editMember])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors: Record<string, string> = {}
        if (!addForm.full_name.trim()) errors.full_name = 'Full name is required'
        if (!addForm.email.trim()) errors.email = 'Email is required'
        if (!addForm.password || addForm.password.length < 8) errors.password = 'Password must be at least 8 characters'
        if (!addForm.role) errors.role = 'Role is required'
        if (Object.keys(errors).length > 0) { setAddErrors(errors); return }
        setAddErrors({})

        const result = await createMutation.mutateAsync({
            full_name: addForm.full_name.trim(),
            email: addForm.email.trim(),
            password: addForm.password,
            role: addForm.role,
            phone: addForm.phone.trim() || undefined,
        })

        if (result.success) {
            toast.success(`${addForm.full_name} has been added to your team.`)
            setAddOpen(false)
            setAddForm({ full_name: '', email: '', password: '', role: 'dispatcher', phone: '' })
        } else {
            toast.error(result.error || 'Failed to create team member')
        }
    }

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editMember) return

        const result = await updateMutation.mutateAsync({
            userId: editMember.id,
            data: {
                full_name: editForm.full_name || undefined,
                role: editForm.role || undefined,
                phone: editForm.phone || undefined,
            },
        })

        if (result.success) {
            toast.success('Team member updated.')
            setEditMember(null)
        } else {
            toast.error(result.error || 'Failed to update team member')
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!resetMember) return
        const errors: Record<string, string> = {}
        if (!resetForm.newPassword || resetForm.newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters'
        if (resetForm.newPassword !== resetForm.confirmPassword) errors.confirmPassword = 'Passwords do not match'
        if (Object.keys(errors).length > 0) { setResetErrors(errors); return }
        setResetErrors({})

        const result = await resetPasswordMutation.mutateAsync({
            userId: resetMember.id,
            newPassword: resetForm.newPassword,
        })

        if (result.success) {
            toast.success(`Password reset for ${resetMember.full_name}.`)
            setResetMember(null)
            setResetForm({ newPassword: '', confirmPassword: '' })
        } else {
            toast.error(result.error || 'Failed to reset password')
        }
    }

    const handleDelete = async () => {
        if (!deleteMemberTarget) return
        const result = await deleteMutation.mutateAsync(deleteMemberTarget.id)
        if (result.success) {
            toast.success(`${deleteMemberTarget.full_name} has been removed.`)
            setDeleteMemberTarget(null)
        } else {
            toast.error(result.error || 'Failed to delete team member')
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Team Members
                        </CardTitle>
                        <CardDescription>
                            Manage dispatchers, fleet managers, and accountants for your company.
                        </CardDescription>
                    </div>
                    {canManage && (
                        <Button onClick={() => setAddOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Team Member
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8 text-muted-foreground">
                                                No team members found. Add your first team member above.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        members.map((member) => {
                                            const isSelf = currentUser?.id === member.id
                                            const isOtherAdmin = member.role === 'admin' && !currentUser?.is_platform_admin && !isSelf
                                            return (
                                                <TableRow key={member.id}>
                                                    <TableCell className="font-medium">
                                                        {member.full_name || 'Unknown User'}
                                                        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', getRoleBadgeClass(member.role || ''))}>
                                                            {(member.role || 'user').replace('_', ' ')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {member.email || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {member.phone || '—'}
                                                    </TableCell>
                                                    {canManage && (
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    disabled={isOtherAdmin}
                                                                    onClick={() => setEditMember(member)}
                                                                    title="Edit"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    disabled={isOtherAdmin}
                                                                    onClick={() => { setResetMember(member); setResetForm({ newPassword: '', confirmPassword: '' }) }}
                                                                    title="Reset Password"
                                                                >
                                                                    <KeyRound className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    disabled={isSelf || isOtherAdmin}
                                                                    onClick={() => setDeleteMemberTarget(member)}
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Add Team Member Dialog ─── */}
            <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setAddErrors({}) } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Add Team Member
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Full Name <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="Jane Smith"
                                value={addForm.full_name}
                                onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                                autoFocus
                            />
                            {addErrors.full_name && <p className="text-xs text-destructive">{addErrors.full_name}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Email <span className="text-destructive">*</span></Label>
                            <Input
                                type="email"
                                placeholder="jane@company.com"
                                value={addForm.email}
                                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                            />
                            {addErrors.email && <p className="text-xs text-destructive">{addErrors.email}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Password <span className="text-destructive">*</span></Label>
                            <Input
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={addForm.password}
                                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                            />
                            {addErrors.password && <p className="text-xs text-destructive">{addErrors.password}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Role <span className="text-destructive">*</span></Label>
                            <Select value={addForm.role} onValueChange={(v) => setAddForm(f => ({ ...f, role: v as 'fleet_manager' | 'dispatcher' | 'accountant' }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                                    <SelectItem value="accountant">Accountant</SelectItem>
                                </SelectContent>
                            </Select>
                            {addErrors.role && <p className="text-xs text-destructive">{addErrors.role}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input
                                type="tel"
                                placeholder="(555) 000-0000"
                                value={addForm.phone}
                                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setAddErrors({}) }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Add Member
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Edit Team Member Dialog ─── */}
            <Dialog open={!!editMember} onOpenChange={(o) => { if (!o) setEditMember(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Edit Team Member
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Full Name</Label>
                            <Input
                                placeholder="Jane Smith"
                                value={editForm.full_name}
                                onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Role</Label>
                            <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                                    <SelectItem value="accountant">Accountant</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Phone</Label>
                            <Input
                                type="tel"
                                placeholder="(555) 000-0000"
                                value={editForm.phone}
                                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditMember(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Reset Password Dialog ─── */}
            <Dialog open={!!resetMember} onOpenChange={(o) => { if (!o) { setResetMember(null); setResetErrors({}) } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-primary" />
                            Reset Password — {resetMember?.full_name}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>New Password <span className="text-destructive">*</span></Label>
                            <Input
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={resetForm.newPassword}
                                onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))}
                                autoFocus
                            />
                            {resetErrors.newPassword && <p className="text-xs text-destructive">{resetErrors.newPassword}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Confirm Password <span className="text-destructive">*</span></Label>
                            <Input
                                type="password"
                                placeholder="Repeat new password"
                                value={resetForm.confirmPassword}
                                onChange={e => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))}
                            />
                            {resetErrors.confirmPassword && <p className="text-xs text-destructive">{resetErrors.confirmPassword}</p>}
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => { setResetMember(null); setResetErrors({}) }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={resetPasswordMutation.isPending} className="gap-2">
                                {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Reset Password
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirmation Dialog ─── */}
            <Dialog open={!!deleteMemberTarget} onOpenChange={(o) => { if (!o) setDeleteMemberTarget(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Remove Team Member?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        This will permanently remove <strong>{deleteMemberTarget?.full_name}</strong> and revoke their access to the platform. This action cannot be undone.
                    </p>
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setDeleteMemberTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="gap-2"
                        >
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {deleteMutation.isPending ? 'Removing...' : 'Yes, Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
