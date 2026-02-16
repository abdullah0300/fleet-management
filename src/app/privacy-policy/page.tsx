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
                                    <h3 className="text-white font-semibold mb-3">A. Account & Profile Data</h3>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Identity:</strong> Name, Email Address, Phone Number.</li>
                                        <li><strong>Credentials:</strong> Encrypted passwords and authentication tokens.</li>
                                        <li><strong>Role Data:</strong> Job titles and permissions (e.g., "Dispatcher", "Driver").</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-xl">
                                    <h3 className="text-white font-semibold mb-3">B. Driver & Vehicle Data</h3>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Driver PII:</strong> Driver's License Number, License Expiry, Medical Card details.</li>
                                        <li><strong>Vehicle Info:</strong> VIN, License Plate, Make, Model, Fuel Level, Odometer readings.</li>
                                        <li><strong>Authentication:</strong> Driver Login PINs (stored securely).</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-xl">
                                    <h3 className="text-white font-semibold mb-3">C. Location Data (GPS)</h3>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Real-time Tracking:</strong> Precise location (latitude/longitude) collected from the Driver Mobile App while on active duty.</li>
                                        <li><strong>Telemetry:</strong> Speed, heading, and timestamp data.</li>
                                        <li><strong>History:</strong> Historical route data for audit and compliance purposes.</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-xl">
                                    <h3 className="text-white font-semibold mb-3">D. Operational Data</h3>
                                    <ul className="space-y-2 text-sm list-disc list-inside text-slate-400">
                                        <li><strong>Job Details:</strong> Customer names, pickup/delivery addresses, cargo manifests.</li>
                                        <li><strong>Documents:</strong> Uploaded images/PDFs (Proof of Delivery, Bill of Lading, Accident Reports).</li>
                                        <li><strong>Financial:</strong> Cost estimates and revenue data related to jobs.</li>
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
                                <li><strong>Dispatching & Routing:</strong> Using address and vehicle location data to assign jobs and calculate efficient routes.</li>
                                <li><strong>Safety & Compliance:</strong> Monitoring speed and location history to ensure driver safety and regulatory compliance (e.g., DOT/ELD mandates).</li>
                                <li><strong>Communication:</strong> Sending notifications about job status, delays, or maintenance requirements.</li>
                                <li><strong>Maintenance:</strong> Tracking odometer readings to schedule preventative vehicle service.</li>
                                <li><strong>Proof of Work:</strong> Storing digital signatures and photos to verify successful deliveries.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 3: Third Parties */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Lock className="w-6 h-6 text-green-500" />
                            3. Data Sharing & Security
                        </h2>
                        <div className="prose prose-invert prose-slate max-w-none">
                            <p>
                                We do not sell your personal data. We only share data with trusted third-party service providers required to run our application:
                            </p>
                            <ul className="mt-4 space-y-2">
                                <li><strong>Supabase:</strong> For secure database hosting and authentication services.</li>
                                <li><strong>Mapbox:</strong> For mapping, geocoding, and routing services.</li>
                            </ul>
                            <p className="mt-6">
                                <strong>Security Measures:</strong> We employ industry-standard security practices, including data encryption in transit (SSL/TLS) and at rest, strict access controls, and regular security audits.
                            </p>
                        </div>
                    </section>

                    {/* Section 4: Rights */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">4. Your Rights</h2>
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
