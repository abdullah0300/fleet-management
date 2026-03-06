import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types/database'
import { toast } from 'sonner'

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchCustomers = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const { data, error: fetchError } = await supabase
                .from('customers')
                .select('*')
                .order('name', { ascending: true })

            if (fetchError) throw fetchError
            setCustomers(data as Customer[])
        } catch (err: any) {
            console.error('Error fetching customers:', err)
            setError(err.message)
            toast.error('Failed to load customers list')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createCustomer = useCallback(async (customerData: Partial<Customer>) => {
        try {
            const { data, error: insertError } = await supabase
                .from('customers')
                .insert([customerData])
                .select()
                .single()

            if (insertError) throw insertError

            setCustomers(prev => [...prev, data as Customer].sort((a, b) => a.name.localeCompare(b.name)))
            toast.success('Customer created successfully')
            return data as Customer
        } catch (err: any) {
            console.error('Error creating customer:', err)
            toast.error('Failed to create customer')
            return null
        }
    }, [])

    const updateCustomer = useCallback(async (id: string, customerData: Partial<Customer>) => {
        try {
            const { data, error: updateError } = await supabase
                .from('customers')
                .update(customerData)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            setCustomers(prev =>
                prev.map(c => c.id === id ? (data as Customer) : c)
                    .sort((a, b) => a.name.localeCompare(b.name))
            )
            toast.success('Customer updated successfully')
            return data as Customer
        } catch (err: any) {
            console.error('Error updating customer:', err)
            toast.error('Failed to update customer')
            return null
        }
    }, [])

    const deleteCustomer = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('customers')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            setCustomers(prev => prev.filter(c => c.id !== id))
            toast.success('Customer deleted')
            return true
        } catch (err: any) {
            console.error('Error deleting customer:', err)
            toast.error('Failed to delete customer')
            return false
        }
    }, [])

    return {
        customers,
        isLoading,
        error,
        fetchCustomers,
        createCustomer,
        updateCustomer,
        deleteCustomer,
    }
}
