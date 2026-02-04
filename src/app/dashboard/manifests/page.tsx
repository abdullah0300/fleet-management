import { getManifests } from '@/lib/data'
import { ManifestList } from '@/components/manifests/ManifestList'

// Server Component
export default async function ManifestsPage() {
    const manifests = await getManifests()
    return <ManifestList initialData={manifests} />
}
