import Link from 'next/link'
import { Package2 } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { VehicleLocationProvider } from '@/contexts/VehicleLocationContext'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <VehicleLocationProvider>
            <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
                <div className="hidden border-r bg-white md:block sticky top-0 h-screen">
                    <div className="flex h-full flex-col gap-2">
                        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                            <Link href="/" className="flex items-center gap-2 font-semibold">
                                <Package2 className="h-6 w-6" />
                                <span className="">Fleet SaaS</span>
                            </Link>
                        </div>
                        <Sidebar />
                    </div>
                </div>
                <div className="flex flex-col min-h-screen">
                    <div className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <Header />
                    </div>

                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-gray-100">
                        {children}
                    </main>
                </div>
            </div>
        </VehicleLocationProvider>
    )
}
