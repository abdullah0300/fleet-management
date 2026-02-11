'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCompanies, deleteCompany } from '@/hooks/useCompanies'
import { createCompanyWithAdmin, CreateCompanyParams } from '@/actions/admin'
import { Plus, Users, Truck, Briefcase, Trash2, Loader2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useIsPlatformAdmin } from '@/hooks/useCurrentUser'

export default function CompaniesPage() {
    const isPlatformAdmin = useIsPlatformAdmin()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState<CreateCompanyParams>({
        name: '',
        slug: '',
        email: '',
        address: '',
        phone: '',
        logo_url: '',
        status: 'active',
        adminEmail: '',
        adminPassword: '',
        adminName: ''
    })

    const queryClient = useQueryClient()

    // Fetch companies
    const { data: companies, isLoading } = useQuery({
        queryKey: ['companies'],
        queryFn: fetchCompanies,
        enabled: isPlatformAdmin // Only fetch if admin
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.success('Company deleted successfully')
        },
        onError: (error) => {
            toast.error('Failed to delete company: ' + error.message)
        }
    })

    if (!isPlatformAdmin && !isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Access Denied</div>
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.slug) {
            toast.error('Name and Slug are required')
            return
        }

        try {
            setIsSubmitting(true)
            const result = await createCompanyWithAdmin(formData)

            if (result.success) {
                toast.success('Company created successfully')
                if (result.userError) {
                    toast.warning(result.userError)
                } else if (formData.adminEmail && formData.adminPassword) {
                    toast.success('Admin user created successfully')
                }

                queryClient.invalidateQueries({ queryKey: ['companies'] })
                setIsCreateOpen(false)
                // Reset form
                setFormData({
                    name: '',
                    slug: '',
                    email: '',
                    address: '',
                    phone: '',
                    logo_url: '',
                    status: 'active',
                    adminEmail: '',
                    adminPassword: '',
                    adminName: ''
                })
            } else {
                toast.error('Failed to create company: ' + result.error)
            }
        } catch (error: any) {
            toast.error('An unexpected error occurred: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
                    <p className="text-muted-foreground">
                        Manage platform tenants and organizations
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Company
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Company</DialogTitle>
                            <DialogDescription>
                                Add a new organization and optionally create its first admin user.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Company Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Company Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Company Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => {
                                                const name = e.target.value
                                                setFormData(prev => ({
                                                    ...prev,
                                                    name,
                                                    slug: generateSlug(name)
                                                }))
                                            }}
                                            placeholder="Acme Transports"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="slug">Slug *</Label>
                                        <Input
                                            id="slug"
                                            value={formData.slug}
                                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                            placeholder="acme-transports"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Company Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value, adminEmail: e.target.value }))}
                                            placeholder="contact@acme.com"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Used for billing/notifications</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            value={formData.address || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                            placeholder="123 Main St, City, Country"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="logo">Logo URL</Label>
                                        <Input
                                            id="logo"
                                            value={formData.logo_url || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="trial">Trial</SelectItem>
                                                <SelectItem value="suspended">Suspended</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Admin User Details */}
                            <div className="space-y-4 rounded-lg bg-muted/50 p-4 border">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-medium uppercase tracking-wider">Initial Admin User</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="adminName">Admin Name</Label>
                                        <Input
                                            id="adminName"
                                            value={formData.adminName || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="adminEmail">Admin Email</Label>
                                        <Input
                                            id="adminEmail"
                                            type="email"
                                            value={formData.adminEmail}
                                            onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                                            placeholder="admin@acme.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="adminPassword">Password</Label>
                                        <Input
                                            id="adminPassword"
                                            type="password"
                                            value={formData.adminPassword || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                                            placeholder="Min 6 characters"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Company'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Counts</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : companies?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No companies found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            companies?.map((company) => (
                                <TableRow key={company.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {company.logo_url ? (
                                                <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded object-cover" />
                                            ) : (
                                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-medium">{company.name}</span>
                                                <span className="text-xs text-muted-foreground">/{company.slug}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={company.status === 'active' ? 'default' : 'secondary'}
                                            className={
                                                company.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                                                    company.status === 'suspended' ? 'bg-red-500 hover:bg-red-600' : ''
                                            }
                                        >
                                            {company.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1" title="Vehicles">
                                                <Truck className="h-3 w-3" />
                                                <span>{company._count?.vehicles || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title="Drivers">
                                                <Users className="h-3 w-3" />
                                                <span>{company._count?.drivers || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title="Jobs">
                                                <Briefcase className="h-3 w-3" />
                                                <span>{company._count?.jobs || 0}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(company.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteMutation.mutate(company.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
