import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Package, MapPin, User, Calendar, Camera } from 'lucide-react'
import { format } from 'date-fns'

interface JobPODViewerProps {
    podData: any[]
}

export function JobPODViewer({ podData }: JobPODViewerProps) {
    if (!podData || podData.length === 0) return null

    // Sort by type (pickup first, then delivery) and timestamp
    const sortedPods = [...podData].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'pickup' ? -1 : 1
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })

    return (
        <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-3 border-b border-green-100">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Proof of Delivery
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {sortedPods.map((pod, index) => (
                    <div
                        key={pod.id}
                        className={`p-4 ${index !== sortedPods.length - 1 ? 'border-b border-green-100' : ''}`}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-green-700 flex items-center gap-1.5">
                                {pod.type === 'pickup' ? (
                                    <Package className="h-4 w-4" />
                                ) : (
                                    <MapPin className="h-4 w-4" />
                                )}
                                {pod.type} Verification
                            </h4>
                            <span className="text-xs text-muted-foreground ml-auto bg-white px-2 py-1 rounded-full border border-green-100">
                                {format(new Date(pod.timestamp), 'MMM d, yyyy h:mm a')}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Signature & Recipient */}
                            <div className="space-y-4">
                                {pod.signature_url ? (
                                    <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                                        <p className="text-xs text-muted-foreground mb-1 ml-1 font-medium">Customer Signature</p>
                                        <img
                                            src={pod.signature_url}
                                            alt="Customer Signature"
                                            className="h-24 object-contain mx-auto"
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center text-muted-foreground text-sm italic h-24 flex items-center justify-center">
                                        No signature collected
                                    </div>
                                )}

                                {pod.recipient_name && (
                                    <div className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-slate-100">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <span className="text-muted-foreground">Received by:</span>
                                        <span className="font-medium">{pod.recipient_name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Photos */}
                            <div>
                                {(() => {
                                    // Handle both array and JSON string formats
                                    let photoArray: string[] = []

                                    if (Array.isArray(pod.photos)) {
                                        photoArray = pod.photos
                                    } else if (typeof pod.photos === 'string') {
                                        try {
                                            photoArray = JSON.parse(pod.photos)
                                        } catch {
                                            photoArray = [pod.photos] // Single URL as string
                                        }
                                    }

                                    // Debug log
                                    if (photoArray.length > 0) {
                                        console.log('POD Photos:', photoArray)
                                    }

                                    return photoArray && photoArray.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground font-medium">Proof Photos ({photoArray.length})</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {photoArray.map((photo: string, idx: number) => (
                                                    <a
                                                        key={idx}
                                                        href={photo}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="aspect-square bg-slate-100 rounded border border-slate-200 overflow-hidden relative group cursor-pointer transition-all hover:border-blue-400 hover:shadow-lg"
                                                    >
                                                        <img
                                                            src={photo}
                                                            alt={`Proof photo ${idx + 1}`}
                                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full">
                                                                <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
                                                                    <Camera className="h-3 w-3" />
                                                                    View Full Size
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic bg-slate-50 rounded border border-slate-200 min-h-[100px]">
                                            No photos attached
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>

                        {pod.notes && (
                            <div className="mt-4 text-sm bg-white p-3 rounded border border-slate-100">
                                <span className="font-medium text-slate-700 block mb-1">Driver Notes:</span>
                                <p className="text-slate-600">{pod.notes}</p>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
