'use client'

import { useState, useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
    onCapture: (dataUrl: string) => void
    onRemove?: (index: number) => void
    label?: string
    maxPhotos?: number
}

export function PhotoCapture({ onCapture, onRemove, label = 'Add Photo', maxPhotos = 4 }: PhotoCaptureProps) {
    const [photos, setPhotos] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        Array.from(files).forEach(file => {
            if (photos.length >= maxPhotos) return

            // Compress image before storing
            const reader = new FileReader()
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string

                // Create image to resize if needed
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const maxSize = 1200 // Max dimension
                    let { width, height } = img

                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize
                            width = maxSize
                        } else {
                            width = (width / height) * maxSize
                            height = maxSize
                        }
                    }

                    canvas.width = width
                    canvas.height = height

                    const ctx = canvas.getContext('2d')
                    ctx?.drawImage(img, 0, 0, width, height)

                    // Convert to JPEG for smaller file size
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)

                    setPhotos(prev => [...prev, compressedDataUrl])
                    onCapture(compressedDataUrl)
                }
                img.src = dataUrl
            }
            reader.readAsDataURL(file)
        })

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index))
        onRemove?.(index)
    }

    return (
        <div className="space-y-3">
            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                            src={photo}
                            alt={`Delivery photo ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-status-error rounded-full flex items-center justify-center text-white hover:bg-status-error/80 transition-colors shadow-md"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                {/* Add Photo Button */}
                {photos.length < maxPhotos && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30",
                            "flex flex-col items-center justify-center gap-1 sm:gap-2",
                            "hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer",
                            "active:scale-95"
                        )}
                    >
                        <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
                    </button>
                )}
            </div>

            {/* Hidden File Input - supports camera on mobile */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Instructions */}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
                {photos.length} of {maxPhotos} photos • Tap to add delivery photos
            </p>
        </div>
    )
}
