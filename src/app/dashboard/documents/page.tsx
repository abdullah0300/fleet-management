import { getDocuments } from '@/lib/data'
import { DocumentsList } from '@/components/documents/DocumentsList'

// Server Component - fetches data on server
export default async function DocumentsPage() {
    const documents = await getDocuments()
    return <DocumentsList initialData={documents} />
}
