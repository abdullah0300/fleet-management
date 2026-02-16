import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Lock, Eye, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicy() {
    const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-500/30 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                        <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">Back to Home</span>
                    </Link>
                    <div className="text-sm font-medium text-slate-500">
                        Last Updated: {lastUpdated}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-20 max-w-4xl">
                <div className="mb-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-6">
                        <ShieldCheck className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Privacy Policy</h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        We value your trust. This policy outlines exactly what data we collect, how we use it to power your fleet, and how we keep it safe.
                    </p>
                </div>

                <div className="space-y-16">
                    {/* Section 1: Collection */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Eye className="w-6 h-6 text-blue-500" />
                            1. Information We Collect
                        </h2>
                        <div className="prose prose-invert prose-slate max-w-none">
                            <p>
                                To provide our comprehensive Fleet Management services, we collect several types of information from Users (Dispatchers, Admins) and Drivers.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-xl">
                                    <h3 className="text-white font-semibold mb-3">A. Identity & Contact Info</h3>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Identity:</strong> Name, Phone Number (for dispatcher contact), Avatar/Profile Picture.</li>
                                        <li><strong>Credentials:</strong> User ID and securely stored PINs for simplified login.</li>
                                        <li><strong>Role Data:</strong> Job titles and permissions.</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-xl">
                                    <h3 className="text-white font-semibold mb-3">B. Location Data (GPS)</h3>
                                    <p className="text-xs text-blue-400 mb-2 font-medium uppercase tracking-wider">Background Tracking Enabled</p>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Precise Location:</strong> Latitude, Longitude, Heading, Speed, Timestamp.</li>
                                        <li><strong>Background Usage:</strong> The app collects location data even when closed to provide dispatchers with real-time visibility of cargo status.</li>
                                        <li><strong>Purpose:</strong> Route optimization and calculating arrival times.</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-xl">
                                    <h3 className="text-white font-semibold mb-3">C. Camera & Media</h3>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Photos:</strong> Images taken by the user or selected from the gallery.</li>
                                        <li><strong>Purpose:</strong> Proof of Delivery (POD) and Document Uploads (Bills of Lading, Tickets).</li>
                                        <li><strong>Storage:</strong> Uploaded securely to cloud storage (Supabase).</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-xl">
                                    <h3 className="text-white font-semibold mb-3">D. Device & Operational</h3>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Device Info:</strong> Device type and OS version for app stability.</li>
                                        <li><strong>Job Data:</strong> Customer names, addresses, and cargo details.</li>
                                        <li><strong>Files:</strong> User-uploaded PDFs and images for operational documentation.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Usage */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Server className="w-6 h-6 text-purple-500" />
                            2. How We Use Your Information
                        </h2>
                        <div className="bg-slate-900/30 border border-white/5 p-8 rounded-2xl space-y-4">
                            <p>We use the collected data strictly to empower your fleet operations:</p>
                            <ul className="space-y-3 list-disc list-inside text-slate-300">
                                <li><strong>Dispatching & Routing:</strong> Using precise location data (foreground and background) to show driver position on the map and navigate to stops.</li>
                                <li><strong>Real-time Visibility:</strong> Background location tracking allows dispatchers to monitor cargo status even when the app is minimized.</li>
                                <li><strong>Proof of Delivery:</strong> Using user-captured photos to verify successful deliveries and sign-offs.</li>
                                <li><strong>Communication:</strong> Using phone numbers for direct contact by dispatchers or customers.</li>
                                <li><strong>Safety & Compliance:</strong> Monitoring speed and location history for DOT/ELD mandates.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 3: Permissions */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Lock className="w-6 h-6 text-orange-500" />
                            3. App Permissions
                        </h2>
                        <div className="prose prose-invert prose-slate max-w-none">
                            <p>The Trucker'sCall mobile app requires the following permissions to function:</p>
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full text-left bg-slate-900/50 rounded-xl border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 text-slate-300">
                                            <th className="p-4 font-semibold">Permission</th>
                                            <th className="p-4 font-semibold">Purpose</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        <tr className="border-b border-white/5">
                                            <td className="p-4 text-white font-medium">Location (Always/Background)</td>
                                            <td className="p-4 text-slate-400">Required to provide real-time tracking to dispatchers even when the app is closed.</td>
                                        </tr>
                                        <tr className="border-b border-white/5">
                                            <td className="p-4 text-white font-medium">Location (When In Use)</td>
                                            <td className="p-4 text-slate-400">Used to track routes and navigate during active jobs.</td>
                                        </tr>
                                        <tr className="border-b border-white/5">
                                            <td className="p-4 text-white font-medium">Camera</td>
                                            <td className="p-4 text-slate-400">Used to take photos for Proof of Delivery and document scanning.</td>
                                        </tr>
                                        <tr className="border-b border-white/5">
                                            <td className="p-4 text-white font-medium">Photo Library</td>
                                            <td className="p-4 text-slate-400">Used to upload existing documents or images from your device.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Third Parties */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-green-500" />
                            4. Data Sharing & Security
                        </h2>
                        <div className="prose prose-invert prose-slate max-w-none">
                            <p>
                                We do not sell your personal data. Data is shared primarily with the <strong>Fleet Management Entity (Employer/Dispatcher)</strong> to enable operational oversight.
                            </p>
                            <p>
                                We also use trusted third-party service providers:
                            </p>
                            <ul className="mt-4 space-y-2">
                                <li><strong>Supabase:</strong> Backend-as-a-Service for secure database, authentication, and file storage.</li>
                                <li><strong>Mapbox:</strong> For map rendering and routing services.</li>
                                <li><strong>Expo:</strong> Application framework for mobile app stability.</li>
                            </ul>
                            <p className="mt-6">
                                <strong>Security Measures:</strong> We employ industry-standard security practices, including data encryption in transit (SSL/TLS) and at rest, strict access controls, and regular security audits.
                            </p>
                        </div>
                    </section>

                    {/* Section 5: Rights */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">5. Your Rights</h2>
                        <p>
                            You have the right to access, correct, or delete your personal data. Fleet Managers may also export operational data for their own records. To exercise these rights or for any privacy-related inquiries, please contact us.
                        </p>
                    </section>

                    {/* Section 5: Contact */}
                    <section className="border-t border-white/10 pt-10 mt-10">
                        <h2 className="text-xl font-bold text-white mb-4">Contact Us</h2>
                        <p className="mb-4">
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <a href="mailto:info@truckerscall.com" className="text-blue-500 hover:text-blue-400 font-medium">
                            info@truckerscall.com
                        </a>
                    </section>

                    <div className="mt-20 pt-10 border-t border-white/5 text-center text-slate-600 text-sm">
                        &copy; {new Date().getFullYear()} Trucker'sCall. All rights reserved.
                    </div>
                </div>
            </main>
        </div>
    )
}
