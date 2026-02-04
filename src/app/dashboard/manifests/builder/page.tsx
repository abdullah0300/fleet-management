import { ManifestBuilder } from '@/components/manifests/ManifestBuilder'

export default function ManifestBuilderPage() {
    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Load Builder</h1>
                    <p className="text-muted-foreground text-sm">Create standard trips by consolidating jobs.</p>
                </div>
            </div>
            <ManifestBuilder />
        </div>
    )
}
