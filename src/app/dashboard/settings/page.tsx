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
import { Building2, Save, Upload, Loader2, MapPin, Mail, Phone, Settings2, Truck, DollarSign, Users } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
    const { data: user, isLoading: isUserLoading } = useCurrentUser()
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
                <TabsList className="grid w-full max-w-4xl grid-cols-2 md:grid-cols-5 h-auto md:h-12 p-1 gap-1">
                    <TabsTrigger value="company" className="h-full">Profile</TabsTrigger>
                    <TabsTrigger value="jobs" className="h-full">Jobs</TabsTrigger>
                    <TabsTrigger value="vehicles" className="h-full">Fleet</TabsTrigger>
                    <TabsTrigger value="costing" className="h-full">Cost Engine</TabsTrigger>
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
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Team Directory
                                </CardTitle>
                                <CardDescription>
                                    View all employees and drivers registered to your company.
                                </CardDescription>
                            </div>
                            {/* Future: Add Invite button here */}
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Email</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teamMembers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                                    No team members found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            teamMembers.map((member) => (
                                                <TableRow key={member.id}>
                                                    <TableCell className="font-medium">
                                                        {member.full_name || 'Unknown User'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="capitalize">
                                                            {(member.role || 'user').replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {member.email || member.phone || 'No contact info'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

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
