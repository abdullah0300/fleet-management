import { getJobs } from '@/lib/data'
import { JobsList } from '@/components/jobs/JobsList'

// Server Component - fetches data on server
export default async function JobsPage() {
    const jobs = await getJobs()
    return <JobsList initialData={jobs} />
}
