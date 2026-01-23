import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Document, DocumentInsert, DocumentUpdate } from '@/types/database'

const supabase = createClient()

// Query keys factory for cache management
export const documentKeys = {
    all: ['documents'] as const,
    lists: () => [...documentKeys.all, 'list'] as const,
    list: (filters?: { entityType?: string; entityId?: string }) =>
        [...documentKeys.lists(), filters] as const,
    details: () => [...documentKeys.all, 'detail'] as const,
    detail: (id: string) => [...documentKeys.details(), id] as const,
    expiring: () => [...documentKeys.all, 'expiring'] as const,
}

interface DocumentQueryResult {
    data: Document[]
    count: number | null
}

/**
 * Fetch all documents with optional filters
 */
async function fetchDocuments(filters?: { entityType?: string; entityId?: string }): Promise<DocumentQueryResult> {
    let query = supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .order('expiry_date', { ascending: true, nullsFirst: false })

    if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType)
    }
    if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: (data || []) as Document[], count }
}

/**
 * Fetch single document
 */
async function fetchDocumentById(id: string): Promise<Document | null> {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as Document
}

/**
 * Fetch expiring documents (within 30 days)
 */
async function fetchExpiringDocuments(): Promise<Document[]> {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString())
        .order('expiry_date', { ascending: true })

    if (error) throw error
    return (data || []) as Document[]
}

/**
 * Upload file to Supabase Storage and create document record
 */
async function uploadDocument(
    file: File,
    metadata: {
        entityType: 'vehicle' | 'driver' | 'job'
        entityId: string
        documentType: string
        expiryDate?: string
    }
): Promise<Document> {
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const filePath = `${metadata.entityType}/${metadata.entityId}/${timestamp}_${metadata.documentType}.${fileExt}`

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

    // Create document record
    const { data, error } = await supabase
        .from('documents')
        .insert({
            entity_type: metadata.entityType,
            entity_id: metadata.entityId,
            document_type: metadata.documentType,
            file_url: urlData.publicUrl,
            expiry_date: metadata.expiryDate || null,
        })
        .select()
        .single()

    if (error) throw error
    return data as Document
}

// ==========================================
// QUERY HOOKS
// ==========================================

/**
 * Hook to fetch all documents
 * Uses TanStack Query with 5 minute cache
 */
export function useDocuments(filters?: { entityType?: string; entityId?: string }) {
    return useQuery({
        queryKey: documentKeys.list(filters),
        queryFn: () => fetchDocuments(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

/**
 * Hook to fetch single document
 */
export function useDocument(id: string) {
    return useQuery({
        queryKey: documentKeys.detail(id),
        queryFn: () => fetchDocumentById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch expiring documents (within 30 days)
 */
export function useExpiringDocuments() {
    return useQuery({
        queryKey: documentKeys.expiring(),
        queryFn: fetchExpiringDocuments,
        staleTime: 5 * 60 * 1000,
    })
}

// ==========================================
// MUTATION HOOKS
// ==========================================

/**
 * Hook to upload and create document
 */
export function useUploadDocument() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            file,
            metadata
        }: {
            file: File
            metadata: {
                entityType: 'vehicle' | 'driver' | 'job'
                entityId: string
                documentType: string
                expiryDate?: string
            }
        }) => {
            return uploadDocument(file, metadata)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
            queryClient.invalidateQueries({ queryKey: documentKeys.expiring() })
        },
    })
}

/**
 * Hook to create document (without file upload, just record)
 */
export function useCreateDocument() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (doc: DocumentInsert) => {
            const { data, error } = await supabase
                .from('documents')
                .insert(doc)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
            queryClient.invalidateQueries({ queryKey: documentKeys.expiring() })
        },
    })
}

/**
 * Hook to update document
 */
export function useUpdateDocument() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: DocumentUpdate }) => {
            const { data, error } = await supabase
                .from('documents')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: documentKeys.expiring() })
        },
    })
}

/**
 * Hook to delete document
 */
export function useDeleteDocument() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            // Get document to find file path
            const { data: doc } = await supabase
                .from('documents')
                .select('file_url')
                .eq('id', id)
                .single()

            // Delete from database
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id)

            if (error) throw error

            // Try to delete from storage (best effort)
            if (doc?.file_url) {
                try {
                    const url = new URL(doc.file_url)
                    const path = url.pathname.split('/documents/')[1]
                    if (path) {
                        await supabase.storage.from('documents').remove([path])
                    }
                } catch (e) {
                    console.warn('Could not delete file from storage:', e)
                }
            }

            return id
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: documentKeys.lists() })
            const previousData = queryClient.getQueryData(documentKeys.lists())
            return { previousData }
        },
        onError: (_, __, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(documentKeys.lists(), context.previousData)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
            queryClient.invalidateQueries({ queryKey: documentKeys.expiring() })
        },
    })
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get document type display name
 */
export function getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        license: 'Driver License',
        registration: 'Vehicle Registration',
        insurance: 'Insurance',
        inspection: 'Inspection Certificate',
        permit: 'Permit',
        contract: 'Contract',
        invoice: 'Invoice',
        other: 'Other',
    }
    return labels[type] || type
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
    if (!expiryDate) return null
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
