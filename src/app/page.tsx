import Link from 'next/link'
import { HeroSection } from '@/components/landing/HeroSection'
import {
  ArrowRight,
  LayoutDashboard,
  Map as MapIcon,
  Truck,
  FileText,
  CalendarDays,
  Wrench,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  Smartphone,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 selection:bg-blue-500/30 overflow-x-hidden">

      {/* Navigation */}
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200 bg-white transition-all duration-300">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
            <Link href="/">
              <img
                src="https://ik.imagekit.io/mctozv7td/truckers%20call_PJNvBU2hk?updatedAt=1757087437647"
                alt="Trucker's Call Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</Link>
            <Link href="#trusted" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Trusted By</Link>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors hidden sm:block">
              Log in
            </Link>
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-6 shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section (Interactive) */}
      <HeroSection />

      {/* Trusted By Ticker */}
      <section id="trusted" className="py-10 border-y border-white/5 bg-slate-950/50 backdrop-blur-sm overflow-hidden">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm font-medium text-slate-500 mb-8 uppercase tracking-widest">Trusted by next-gen logistics teams</p>
          <div className="flex justify-center items-center gap-12 md:gap-24 grayscale opacity-40">
            {['Acme Logistics', 'FastTrack', 'Global Freight', 'Prime Haulers', 'BlueSky Transport'].map((brand, i) => (
              <div key={i} className="text-lg font-bold text-slate-300 font-mono flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-slate-700" />
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section id="features" className="py-32 bg-[#020617] relative">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] -z-10" />

        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-white">
              Everything Your Fleet Needs. <br />
              <span className="text-slate-500">Nothing It Doesn't.</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Our bento-grid architecture ensures every tool is just one click away. No clutter, just control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 auto-rows-[300px] gap-6 max-w-7xl mx-auto">

            {/* 1. Dispatch Command (Large) */}
            <BentoCard className="md:col-span-6 lg:col-span-8 bg-gradient-to-br from-slate-900 to-slate-950">
              <div className="p-8 h-full flex flex-col justify-between relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
                    <LayoutDashboard className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Visual Dispatch Command</h3>
                  <p className="text-slate-400 max-w-md">Drag-and-drop jobs, assign drivers, and manage your entire fleet from a single, intuitive canvas.</p>
                </div>

                {/* Abstract Visual */}
                <div className="absolute right-0 bottom-0 w-2/3 h-2/3 bg-slate-800/30 rounded-tl-3xl border-t border-l border-white/5 p-4 transition-transform group-hover:scale-105 group-hover:-translate-x-2 group-hover:-translate-y-2">
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <div className="bg-slate-700/30 rounded-lg w-full h-full animate-pulse-slow" />
                    <div className="bg-slate-700/30 rounded-lg w-full h-3/4" />
                    <div className="bg-slate-700/30 rounded-lg w-full h-full" />
                    <div className="bg-blue-600/20 rounded-lg w-full h-full border border-blue-500/30" />
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* 2. Routes (Tall) */}
            <BentoCard className="md:col-span-3 lg:col-span-4 bg-slate-900">
              <div className="p-8 h-full flex flex-col relative overflow-hidden group">
                <div className="relative z-10 mb-auto">
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-4">
                    <MapIcon className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Smart Routing</h3>
                  <p className="text-sm text-slate-400">AI-optimized routes to save fuel and time.</p>
                </div>

                {/* Map Visual */}
                <div className="absolute inset-x-0 bottom-0 h-48 bg-slate-950/50 border-t border-white/5">
                  <div className="w-full h-full relative opacity-50">
                    {/* CSS Map Lines */}
                    <svg className="w-full h-full" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="2" fill="none">
                      <path d="M 50 150 Q 150 50 250 100 T 400 150" className="path-animate" />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* 3. Mobile App (Tall) */}
            <BentoCard className="md:col-span-3 lg:col-span-4 bg-slate-900">
              <div className="p-8 h-full flex flex-col relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-green-600/20 border border-green-500/30 flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Driver App</h3>
                  <p className="text-sm text-slate-400">Native mobile experience for real-time updates.</p>
                </div>

                {/* Phone Mockup (CSS) */}
                <div className="absolute bottom-[-20px] right-8 w-40 h-64 bg-slate-950 border-4 border-slate-800 rounded-t-3xl shadow-2xl transform transition-transform group-hover:translate-y-[-10px]">
                  <div className="w-full h-full bg-slate-900 p-3 space-y-2">
                    <div className="h-2 w-16 bg-slate-800 rounded-full mx-auto mb-4" />
                    <div className="h-16 w-full bg-green-500/10 rounded-lg border border-green-500/20 p-2">
                      <div className="h-2 w-12 bg-green-500/40 rounded mb-1" />
                      <div className="h-4 w-20 bg-green-500/40 rounded" />
                    </div>
                    <div className="h-16 w-full bg-slate-800/30 rounded-lg" />
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* 4. Tracking (Medium) */}
            <BentoCard className="md:col-span-3 lg:col-span-4 bg-slate-900">
              <div className="p-8 relative h-full group">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
                    <Navigation className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-xs rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Live Tracking</h3>
                <p className="text-sm text-slate-400">Real-time telemetry and geofencing.</p>

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </BentoCard>


            {/* 5. Documents (Medium) */}
            <BentoCard className="md:col-span-3 lg:col-span-4 bg-slate-900">
              <div className="p-8 relative h-full overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors" />

                <div className="w-12 h-12 rounded-lg bg-pink-600/20 border border-pink-500/30 flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-pink-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Digital PODs</h3>
                <p className="text-sm text-slate-400">Instant document uploads and cloud storage.</p>
              </div>
            </BentoCard>

            {/* 6. Maintenance (Medium) */}
            <BentoCard className="md:col-span-6 lg:col-span-6 bg-slate-900">
              <div className="p-8 flex items-center gap-6 h-full relative overflow-hidden group">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-yellow-600/10 border border-yellow-500/20 flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Fleet Maintenance</h3>
                  <p className="text-slate-400 text-sm mb-3">Preventative scheduling to keep your trucks on the road.</p>
                  <div className="flex gap-2">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded border border-white/5">Service Logs</span>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded border border-white/5">Cost Tracking</span>
                  </div>
                </div>
                <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/5 rounded-full blur-xl group-hover:bg-yellow-500/10 transition-colors" />
              </div>
            </BentoCard>

            {/* 7. Analytics (Medium) */}
            <BentoCard className="md:col-span-6 lg:col-span-6 bg-slate-900">
              <div className="p-8 flex items-center gap-6 h-full relative overflow-hidden group">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Performance Analytics</h3>
                  <p className="text-slate-400 text-sm mb-3">Deep insights into fuel, driver performance, and revenue.</p>
                  <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-cyan-500 w-3/4 animate-pulse-slow" />
                  </div>
                </div>
              </div>
            </BentoCard>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-800 bg-[#020617] relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            {/* Logo & Info */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-sm">
              <div className="mb-6 bg-white p-2 rounded-lg inline-block">
                <img
                  src="https://ik.imagekit.io/mctozv7td/truckers%20call_PJNvBU2hk?updatedAt=1757087437647"
                  alt="Trucker's Call Logo"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="text-slate-400 text-base leading-relaxed mb-6">
                The complete operating system for modern logistics. Built for speed, reliability, and scale.
              </p>
              <a href="mailto:info@truckerscall.com" className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors font-medium">
                info@truckerscall.com
              </a>
            </div>

            {/* Links */}
            <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm">
              <div className="flex flex-col gap-4">
                <h4 className="font-semibold text-white tracking-wide">Platform</h4>
                <Link href="#features" className="text-slate-400 hover:text-white transition-colors">Features</Link>
                <Link href="#trusted" className="text-slate-400 hover:text-white transition-colors">Trusted By</Link>
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="font-semibold text-white tracking-wide">Legal</h4>
                <Link href="/privacy-policy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
            <div>&copy; 2026 Trucker'sCall. All rights reserved.</div>

            <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
              <span>Designed & Created by</span>
              <div className="flex gap-1.5 font-medium text-slate-300">
                <a href="https://webcraftio.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Webcraftio</a>
                <span className="text-slate-600">&</span>
                <a href="https://nexterix.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Nexterix</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function BentoCard({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/5 shadow-2xl overflow-hidden hover:border-white/10 transition-colors ${className}`}>
      {children}
    </div>
  )
}
