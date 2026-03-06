'use client'

import { useState, useEffect } from 'react'
import { useCustomers } from '@/hooks/useCustomers'
import { Customer } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { ContactRound, Plus, Search, Pencil, Trash2, Mail, Phone, Loader2, Building } from 'lucide-react'

// ─── Customer Form Modal ─────────────────────────────────────────────────────

interface CustomerFormModalProps {
    open: boolean
    onClose: () => void
    customer?: Customer | null
    onSave: (data: Partial<Customer>) => Promise<void>
    isSaving: boolean
}

function CustomerFormModal({ open, onClose, customer, onSave, isSaving }: CustomerFormModalProps) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [billingAddress, setBillingAddress] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (open) {
            setName(customer?.name || '')
            setPhone(customer?.phone || '')
            setEmail(customer?.email || '')
            setBillingAddress(customer?.billing_address || '')
            setNotes(customer?.notes || '')
        }
    }, [customer, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        await onSave({
            name: name.trim(),
            phone: phone || null,
            email: email || null,
            billing_address: billingAddress || null,
            notes: notes || null,
        })
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ContactRound className="h-5 w-5 text-primary" />
                        {customer ? 'Edit Customer' : 'New Customer'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Name <span className="text-destructive">*</span></Label>
                        <Input
                            placeholder="Full name or company"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <PhoneInput value={phone} onChange={setPhone} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                className="pl-9"
                                placeholder="client@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Billing Address</Label>
                        <Input
                            placeholder="123 Main St, City, State"
                            value={billingAddress}
                            onChange={e => setBillingAddress(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Notes</Label>
                        <textarea
                            className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                            placeholder="Any additional notes..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving || !name.trim()}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {customer ? 'Save Changes' : 'Create Customer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ─── Delete Confirm Dialog ───────────────────────────────────────────────────

interface DeleteDialogProps {
    customer: Customer | null
    onClose: () => void
    onConfirm: () => void
}

function DeleteDialog({ customer, onClose, onConfirm }: DeleteDialogProps) {
    return (
        <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Customer
                    </DialogTitle>
                </DialogHeader>
                <div className="py-2">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete <strong className="text-foreground">{customer?.name}</strong>?
                        Existing jobs linked to this customer will not be affected.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={onConfirm}>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CustomersPage() {
    const { customers, isLoading, fetchCustomers, createCustomer, updateCustomer, deleteCustomer } = useCustomers()
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchCustomers()
    }, [])

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)
    )

    const handleOpenNew = () => {
        setEditingCustomer(null)
        setModalOpen(true)
    }

    const handleOpenEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setModalOpen(true)
    }

    const handleSave = async (data: Partial<Customer>) => {
        setIsSaving(true)
        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, data)
        } else {
            await createCustomer(data)
        }
        setIsSaving(false)
        setModalOpen(false)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        await deleteCustomer(deleteTarget.id)
        setDeleteTarget(null)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b bg-background">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <ContactRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
                        <p className="text-sm text-muted-foreground">{customers.length} total customers</p>
                    </div>
                </div>
                <Button onClick={handleOpenNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Customer
                </Button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 border-b bg-muted/30">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or phone..."
                        className="pl-9 bg-background"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="p-4 rounded-full bg-muted">
                            <ContactRound className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                            {search ? 'No customers match your search' : 'No customers yet'}
                        </p>
                        {!search && (
                            <Button onClick={handleOpenNew} variant="outline" className="gap-2 mt-1">
                                <Plus className="h-4 w-4" />
                                Add your first customer
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(customer => (
                            <Card key={customer.id} className="group hover:shadow-md transition-shadow border">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-primary font-bold text-sm">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{customer.name}</p>
                                                {customer.billing_address && (
                                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                                        <Building className="h-3 w-3 shrink-0" />
                                                        {customer.billing_address}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Edit/Delete — visible on hover */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => handleOpenEdit(customer)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setDeleteTarget(customer)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {customer.phone && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                                <span>{customer.phone}</span>
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{customer.email}</span>
                                            </div>
                                        )}
                                        {customer.notes && (
                                            <p className="text-xs text-muted-foreground/70 pt-1 line-clamp-2 border-t mt-2">
                                                {customer.notes}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            <CustomerFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                customer={editingCustomer}
                onSave={handleSave}
                isSaving={isSaving}
            />

            {/* Delete Confirm */}
            <DeleteDialog
                customer={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}
