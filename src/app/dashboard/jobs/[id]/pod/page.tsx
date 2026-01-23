'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, MapPin, User, Clock, Camera, PenLine, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useJob } from '@/hooks/useJobs'
import { useCreatePOD } from '@/hooks/usePOD'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SignatureCanvas } from '@/components/delivery/SignatureCanvas'
import { PhotoCapture } from '@/components/delivery/PhotoCapture'

export default function ProofOfDeliveryPage() {
    const router = useRouter()
    const params = useParams()
    const jobId = params.id as string

    const { data: job, isLoading, error } = useJob(jobId)
    const createPODMutation = useCreatePOD()

    const [signature, setSignature] = useState<string | null>(null)
    const [photos, setPhotos] = useState<string[]>([])
    const [recipientName, setRecipientName] = useState('')
    const [notes, setNotes] = useState('')
    const [isCompleted, setIsCompleted] = useState(false)

    const handleSignatureSave = (dataUrl: string) => {
        setSignature(dataUrl)
    }

    const handlePhotoCapture = (dataUrl: string) => {
        setPhotos(prev => [...prev, dataUrl])
    }

    const handleSubmit = async () => {
        if (!signature) {
            alert('Please capture a signature before completing delivery')
            return
        }

        if (!recipientName.trim()) {
            alert('Please enter the recipient name')
            return
        }

        try {
            await createPODMutation.mutateAsync({
                jobId,
                recipientName: recipientName.trim(),
                deliveryNotes: notes.trim() || undefined,
                signatureDataUrl: signature,
                photoDataUrls: photos
            })

            setIsCompleted(true)
        } catch (error) {
            console.error('Error completing delivery:', error)
            alert('Failed to complete delivery. Please check your connection and try again.')
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <Skeleton className="h-8 w-[200px]" />
                </div>
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        )
    }

    if (error || !job) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="h-12 w-12 text-status-error mb-4" />
                <h2 className="text-xl font-semibold">Job Not Found</h2>
                <p className="text-muted-foreground mt-2">The delivery job could not be found.</p>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        )
    }

    if (isCompleted) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-status-success-muted flex items-center justify-center mb-6 animate-pulse">
                    <CheckCircle2 className="h-10 w-10 text-status-success" />
                </div>
                <h2 className="text-2xl font-bold text-status-success">Delivery Complete!</h2>
                <p className="text-muted-foreground mt-2">
                    The proof of delivery has been recorded and saved successfully.
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                    <p>✓ Signature uploaded</p>
                    {photos.length > 0 && <p>✓ {photos.length} photo(s) uploaded</p>}
                    <p>✓ Job status updated to completed</p>
                </div>
                <div className="mt-6 space-y-2 w-full">
                    <Button onClick={() => router.push('/dashboard/jobs')} className="w-full">
                        Back to Jobs
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/jobs/${jobId}`)}
                        className="w-full"
                    >
                        View Job Details
                    </Button>
                </div>
            </div>
        )
    }

    const pickup = job.pickup_location as { address?: string } | null
    const delivery = job.delivery_location as { address?: string } | null

    return (
        <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-lg sm:text-2xl font-bold truncate">Proof of Delivery</h1>
                        <Badge className="badge-purple shrink-0">{job.job_number}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                        Confirm delivery and capture signature
                    </p>
                </div>
            </div>

            {/* Job Summary */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Delivery Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-status-success-muted flex items-center justify-center shrink-0">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-status-success" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Pickup</p>
                            <p className="text-xs sm:text-sm font-medium truncate">{pickup?.address || 'Not set'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-status-error-muted flex items-center justify-center shrink-0">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-status-error" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Delivery</p>
                            <p className="text-xs sm:text-sm font-medium truncate">{delivery?.address || 'Not set'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-status-info-muted flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-status-info" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Customer</p>
                            <p className="text-xs sm:text-sm font-medium">{job.customer_name}</p>
                            {job.customer_phone && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground">{job.customer_phone}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recipient Information */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Recipient Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="recipientName" className="text-xs sm:text-sm">Recipient Name *</Label>
                        <Input
                            id="recipientName"
                            placeholder="Name of person receiving delivery"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="notes" className="text-xs sm:text-sm">Delivery Notes</Label>
                        <textarea
                            id="notes"
                            className="w-full min-h-[50px] sm:min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Any notes about the delivery..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Photos */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Delivery Photos
                        <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <PhotoCapture onCapture={handlePhotoCapture} maxPhotos={4} />
                </CardContent>
            </Card>

            {/* Signature */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PenLine className="h-4 w-4" />
                            Signature *
                        </div>
                        {signature && (
                            <Badge className="badge-success gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Captured
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    {signature ? (
                        <div className="space-y-3">
                            <div className="border rounded-lg p-2 bg-white">
                                <img
                                    src={signature}
                                    alt="Captured signature"
                                    className="max-h-[120px] sm:max-h-[150px] mx-auto"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSignature(null)}
                                className="w-full"
                            >
                                Re-capture Signature
                            </Button>
                        </div>
                    ) : (
                        <SignatureCanvas onSave={handleSignatureSave} height={120} />
                    )}
                </CardContent>
            </Card>

            {/* Timestamp */}
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                {new Date().toLocaleString()}
            </div>

            {/* Submit Button */}
            <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!signature || !recipientName.trim() || createPODMutation.isPending}
                className="w-full gap-2"
            >
                {createPODMutation.isPending ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Uploading & Completing...
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="h-5 w-5" />
                        Complete Delivery
                    </>
                )}
            </Button>

            {/* Upload Progress Hint */}
            {createPODMutation.isPending && (
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                    Uploading signature and {photos.length} photo(s) to secure storage...
                </p>
            )}
        </div>
    )
}
