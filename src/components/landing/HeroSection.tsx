'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Truck } from 'lucide-react'

export function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [rotation, setRotation] = useState({ x: 0, y: 0 })
    const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Calculate percentage for spotlight
        const xPct = (x / rect.width) * 100
        const yPct = (y / rect.height) * 100
        setMousePosition({ x: xPct, y: yPct })

        // Calculate rotation (max 10 degrees)
        const centerX = rect.width / 2
        const centerY = rect.height / 2

        const rotateY = ((x - centerX) / centerX) * 5 // Max 5 deg
        const rotateX = ((centerY - y) / centerY) * 5 // Max 5 deg, inverted Y

        setRotation({ x: rotateX, y: rotateY })
    }

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 })
        setMousePosition({ x: 50, y: 50 })
    }

    return (
        <section
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative pt-32 pb-32 lg:pt-48 lg:pb-40 overflow-hidden min-h-[90vh] flex flex-col justify-center perspective-2000"
        >
            {/* Animated Grid Background */}
            <div className="absolute inset-0 -z-20 opacity-20"
                style={{
                    backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)'
                }}
            />

            {/* Moving Spotlight Background */}
            <div
                className="absolute inset-0 -z-10 transition-opacity duration-500"
                style={{
                    background: `radial-gradient(1000px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(29, 78, 216, 0.15), transparent 60%)`
                }}
            />

            <div className="container mx-auto px-6 text-center z-10 relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-sm font-medium mb-8 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Introducing The Future of Logistics
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 max-w-5xl mx-auto bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both drop-shadow-2xl">
                    Fleet Management, <br />
                    <span className="text-blue-500">Reimagined.</span>
                </h1>

                <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both delay-100">
                    The all-in-one operating system for modern trucking. Dispatch, track, and manage your fleet with AI-powered precision.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 fill-mode-both delay-200 mb-20">
                    <Link href="/dashboard">
                        <Button size="lg" className="h-14 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-lg font-semibold shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] border border-blue-400/20">
                            Get Started Free
                        </Button>
                    </Link>
                    <Button size="lg" variant="outline" className="h-14 px-10 border-slate-700 bg-slate-900/50 backdrop-blur-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-full text-lg font-medium transition-all group">
                        Watch Demo <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>

            {/* Interactive 3D Dashboard Preview */}
            <div
                className="relative mx-auto max-w-6xl px-6 animate-in fade-in slide-in-from-bottom-24 duration-1000 fill-mode-both delay-300 transform-gpu"
                style={{
                    transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transition: 'transform 0.1s ease-out'
                }}
            >
                <div className="relative rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-2 shadow-2xl shadow-blue-500/10 group overflow-hidden">

                    {/* Glossy Reflection Overlay */}
                    <div
                        className="absolute inset-0 z-20 pointer-events-none opacity-50 mix-blend-overlay transition-opacity duration-300"
                        style={{
                            background: `linear-gradient(${115 + rotation.x * 5}deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.0) 50%)`
                        }}
                    />

                    {/* Inner Frame */}
                    <div className="rounded-lg overflow-hidden bg-[#0F172A] border border-white/5 aspect-[16/9] relative shadow-inner">
                        {/* Mock UI Header */}
                        <div className="h-14 border-b border-white/5 bg-slate-900/80 flex items-center px-6 justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                                <div className="h-4 w-32 bg-slate-800/50 rounded-full" />
                            </div>
                            <div className="flex gap-2">
                                <div className="h-8 w-8 rounded-full bg-blue-600/20 border border-blue-500/30" />
                            </div>
                        </div>

                        {/* Mock Content Layout */}
                        <div className="flex h-full">
                            {/* Sidebar */}
                            <div className="hidden md:block w-64 border-r border-white/5 bg-slate-900/20 p-4 space-y-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 opacity-50 group-hover:opacity-70 transition-opacity" style={{ transitionDelay: `${i * 50}ms` }}>
                                        <div className="w-5 h-5 rounded bg-slate-800" />
                                        <div className="h-3 w-20 rounded bg-slate-800" />
                                    </div>
                                ))}
                            </div>

                            {/* Main Area */}
                            <div className="flex-1 p-6 bg-[#020617]">
                                <div className="grid grid-cols-3 gap-6 mb-6">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-24 rounded-lg bg-slate-900/50 border border-white/5 p-4 relative overflow-hidden group/card hover:border-blue-500/30 transition-colors">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-50 group-hover/card:opacity-100 transition-opacity" />
                                            <div className="h-4 w-12 bg-slate-800 rounded mb-2" />
                                            <div className="h-8 w-24 bg-slate-800 rounded" />
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-4 gap-4 h-64">
                                    <div className="col-span-3 rounded-lg bg-slate-900/30 border border-white/5 p-4 relative overflow-hidden">
                                        {/* Mock Map */}
                                        <div className="absolute inset-0 bg-slate-900 opacity-50" />

                                        {/* Pulse Waves */}
                                        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] animate-pulse z-10" />
                                        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-50" />

                                        <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] animate-pulse delay-75 z-10" />
                                        <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,1)] animate-pulse delay-150 z-10" />

                                        <div className="absolute flex items-center justify-center inset-0 text-slate-800 font-mono text-sm tracking-widest uppercase font-bold opacity-30">
                                            Live Operations Map
                                        </div>
                                    </div>
                                    <div className="col-span-1 rounded-lg bg-slate-900/30 border border-white/5 p-3 space-y-2">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="h-10 rounded bg-slate-800/50 w-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Highlight Overlay */}
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 pointer-events-none" />
                </div>
            </div>
        </section>
    )
}
