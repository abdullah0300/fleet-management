import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { jobKeys } from './useJobs'

const supabase = createClient()

interface PODUploadData {
    jobId: string
    recipientName: string
    deliveryNotes?: string
    signatureDataUrl: string
    photoDataUrls: string[]
}

interface PODResult {
    podId: string
    signatureUrl: string
    photoUrls: string[]
}

/**
 * Convert base64 data URL to Blob for upload
 */
function dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
}

/**
 * Upload a file to Supabase Storage
 */
async function uploadToStorage(
    bucket: string,
    path: string,
    dataUrl: string
): Promise<string> {
    const blob = dataUrlToBlob(dataUrl)

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: blob.type
        })

    if (error) throw error

    // Get public URL
    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

    return publicUrlData.publicUrl
}

/**
 * Create Proof of Delivery with signature and photos
 */
async function createPOD(data: PODUploadData): Promise<PODResult> {
    const { jobId, recipientName, deliveryNotes, signatureDataUrl, photoDataUrls } = data
    const timestamp = Date.now()

    // 1. Upload signature to storage
    const signaturePath = `signatures/${jobId}/${timestamp}_signature.png`
    const signatureUrl = await uploadToStorage('delivery-proofs', signaturePath, signatureDataUrl)

    // 2. Upload photos to storage
    const photoUrls: string[] = []
    for (let i = 0; i < photoDataUrls.length; i++) {
        const photoPath = `photos/${jobId}/${timestamp}_photo_${i}.jpg`  // Use .jpg for JPEG data
        const photoUrl = await uploadToStorage('delivery-proofs', photoPath, photoDataUrls[i])
        photoUrls.push(photoUrl)
    }

    // 3. Create POD record in database with photos array (matching mobile app schema)
    const { data: podData, error: podError } = await supabase
        .from('proof_of_delivery')
        .insert({
            job_id: jobId,
            type: 'delivery',  // Required field: 'pickup' or 'delivery'
            recipient_name: recipientName,
            signature_url: signatureUrl,
            photos: photoUrls,  // Store photos as array in main table
            notes: deliveryNotes || null,
            timestamp: new Date().toISOString()
        })
        .select()
        .single()

    if (podError) throw podError

    // 4. Update job status to completed
    const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', jobId)

    if (jobError) throw jobError

    return {
        podId: podData.id,
        signatureUrl,
        photoUrls
    }
}

/**
 * Hook to create Proof of Delivery
 * Uploads signature and photos to Supabase Storage
 * Creates POD record in database
 * Updates job status to completed
 */
export function useCreatePOD() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createPOD,
        onSuccess: (result, variables) => {
            // Invalidate job caches to reflect status change
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
            queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.jobId) })
        },
    })
}

/**
 * Get POD for a specific job
 */
export async function getPODByJobId(jobId: string) {
    const { data, error } = await supabase
        .from('proof_of_delivery')
        .select(`
            *,
            proof_of_delivery_photos (*)
        `)
        .eq('job_id', jobId)
        .maybeSingle()

    if (error) throw error
    return data
}
