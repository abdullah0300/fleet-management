import { notFound } from 'next/navigation'
import { getManifest } from '@/lib/data'
import { ManifestDetailsClient } from '@/components/manifests/ManifestDetailsClient'

interface ManifestDetailsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function ManifestDetailsPage({ params }: ManifestDetailsPageProps) {
    const { id } = await params
    const manifest = await getManifest(id)

    if (!manifest) {
        notFound()
    }

    return <ManifestDetailsClient manifest={manifest} />
}
