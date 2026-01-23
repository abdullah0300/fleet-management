'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import SignaturePad from 'signature_pad'
import { Button } from '@/components/ui/button'
import { RotateCcw, Check } from 'lucide-react'

interface SignatureCanvasProps {
    onSave: (dataUrl: string) => void
    width?: number
    height?: number
}

export function SignatureCanvas({ onSave, height = 200 }: SignatureCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const signaturePadRef = useRef<SignaturePad | null>(null)
    const [isEmpty, setIsEmpty] = useState(true)

    const initSignaturePad = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return

        const canvas = canvasRef.current
        const container = containerRef.current

        // Set canvas size based on container width
        const ratio = Math.max(window.devicePixelRatio || 1, 1)
        const width = container.offsetWidth

        canvas.width = width * ratio
        canvas.height = height * ratio
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.scale(ratio, ratio)
        }

        // Clear previous instance
        if (signaturePadRef.current) {
            signaturePadRef.current.off()
        }

        signaturePadRef.current = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            minWidth: 1,
            maxWidth: 2.5,
        })

        signaturePadRef.current.addEventListener('endStroke', () => {
            setIsEmpty(signaturePadRef.current?.isEmpty() ?? true)
        })
    }, [height])

    useEffect(() => {
        initSignaturePad()

        // Handle resize
        const handleResize = () => {
            // Save current signature data
            const data = signaturePadRef.current?.toData()
            initSignaturePad()
            // Restore signature data
            if (data && signaturePadRef.current) {
                signaturePadRef.current.fromData(data)
                setIsEmpty(signaturePadRef.current.isEmpty())
            }
        }

        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            signaturePadRef.current?.off()
        }
    }, [initSignaturePad])

    const handleClear = () => {
        signaturePadRef.current?.clear()
        setIsEmpty(true)
    }

    const handleSave = () => {
        if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
            // Trim white space and export as PNG
            const dataUrl = signaturePadRef.current.toDataURL('image/png')
            onSave(dataUrl)
        }
    }

    return (
        <div className="space-y-3">
            <div
                ref={containerRef}
                className="border-2 border-dashed rounded-lg overflow-hidden bg-white"
            >
                <canvas
                    ref={canvasRef}
                    className="touch-none cursor-crosshair w-full"
                    style={{ height: `${height}px` }}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Sign above using your finger or stylus
                </p>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClear}
                        className="gap-1 h-8 text-xs px-2 sm:px-3"
                    >
                        <RotateCcw className="h-3 w-3" />
                        <span className="hidden sm:inline">Clear</span>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={isEmpty}
                        className="gap-1 h-8 text-xs px-2 sm:px-3"
                    >
                        <Check className="h-3 w-3" />
                        <span className="hidden sm:inline">Confirm</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
