'use client'

import { useState } from 'react'
import { Camera, PenLine, User, Clock, MapPin, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

interface PODData {
    id: string
    recipient_name: string
    signature_url?: string | null
    notes?: string | null
    timestamp: string
    photos?: { photo_url: string }[]
}

interface PODViewerProps {
    pod: PODData
    trigger?: React.ReactNode
}

export function PODViewer({ pod, trigger }: PODViewerProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="outline" size="sm" className="gap-2">
                            <PenLine className="h-4 w-4" />
                            View POD
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Proof of Delivery</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Recipient */}
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-status-success-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-status-success" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Received by</p>
                                <p className="font-semibold">{pod.recipient_name}</p>
                            </div>
                            <Badge className="badge-success ml-auto">Delivered</Badge>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(pod.timestamp).toLocaleString()}
                        </div>

                        {/* Signature */}
                        {pod.signature_url && (
                            <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <PenLine className="h-4 w-4" />
                                    Signature
                                </p>
                                <div className="border rounded-lg p-3 bg-white">
                                    <img
                                        src={pod.signature_url}
                                        alt="Signature"
                                        className="max-h-[150px] mx-auto"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Photos */}
                        {pod.photos && pod.photos.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Camera className="h-4 w-4" />
                                    Photos ({pod.photos.length})
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {pod.photos.map((photo, i) => (
                                        <button
                                            key={i}
                                            className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                                            onClick={() => setSelectedPhoto(photo.photo_url)}
                                        >
                                            <img
                                                src={photo.photo_url}
                                                alt={`Delivery photo ${i + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {pod.notes && (
                            <div>
                                <p className="text-sm font-medium mb-1">Notes</p>
                                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                    {pod.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <Dialog open={true} onOpenChange={() => setSelectedPhoto(null)}>
                    <DialogContent className="max-w-3xl p-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 z-10"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <img
                            src={selectedPhoto}
                            alt="Delivery photo"
                            className="w-full max-h-[80vh] object-contain rounded-lg"
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
