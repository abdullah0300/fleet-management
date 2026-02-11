import { login } from './actions'
import { Truck, MapPin, Shield, BarChart3 } from 'lucide-react'

export default function LoginPage() {
    return (
        <>
            {/* Left Panel - Brand Side */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                {/* Background patterns */}
                <div className="absolute inset-0 opacity-[0.03]">
                    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Decorative road lines */}
                <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: 'linear-gradient(to right, #548EC7, #3d6f9e, #548EC7)' }} />
                <div className="absolute bottom-4 left-0 right-0 h-[2px]" style={{ backgroundColor: 'rgba(84, 142, 199, 0.3)' }} />

                {/* Floating glow accents */}
                <div className="absolute top-20 -left-20 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(84, 142, 199, 0.1)' }} />
                <div className="absolute bottom-40 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Top: Logo */}
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#548EC7', boxShadow: '0 10px 15px -3px rgba(84, 142, 199, 0.25)' }}>
                            <Truck className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Trucker&apos;sCall</h2>
                            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'rgba(84, 142, 199, 0.8)' }}>Fleet Management Platform</p>
                        </div>
                    </div>

                    {/* Middle: Hero Text */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h1 className="text-5xl font-extrabold text-white leading-tight">
                                Command Your<br />
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #548EC7, #3d6f9e)' }}>
                                    Entire Fleet
                                </span>
                            </h1>
                            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                                Track vehicles, manage drivers, optimize routes, and keep your trucks rolling — all from one powerful dashboard.
                            </p>
                        </div>

                        {/* Feature Pills */}
                        <div className="grid grid-cols-2 gap-4 max-w-md">
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                                <MapPin className="h-5 w-5 shrink-0" style={{ color: '#548EC7' }} />
                                <span className="text-sm text-slate-300 font-medium">Live Tracking</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                                <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
                                <span className="text-sm text-slate-300 font-medium">Fleet Safety</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                                <BarChart3 className="h-5 w-5 shrink-0" style={{ color: '#548EC7' }} />
                                <span className="text-sm text-slate-300 font-medium">Cost Analytics</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                                <Truck className="h-5 w-5 text-purple-400 shrink-0" />
                                <span className="text-sm text-slate-300 font-medium">Route Optimization</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Testimonial / tagline */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                <div className="h-8 w-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#548EC7' }}>A</div>
                                <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white">B</div>
                                <div className="h-8 w-8 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white">C</div>
                            </div>
                            <p className="text-sm text-slate-500">Trusted by dispatchers & fleet owners</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-sm space-y-8">
                    {/* Mobile Logo (hidden on lg+) */}
                    <div className="flex flex-col items-center gap-3 lg:hidden">
                        <div className="h-14 w-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#548EC7' }}>
                            <Truck className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold tracking-tight">Trucker&apos;sCall</h2>
                            <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Fleet Management Platform</p>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm space-y-6">
                        <div className="space-y-2 text-center">
                            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                            <p className="text-sm text-muted-foreground">
                                Enter your credentials to access your dashboard
                            </p>
                        </div>

                        <form className="flex flex-col gap-5">
                            <div className="grid gap-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="dispatcher@truckerscall.com"
                                    required
                                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:border-[#548EC7] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ '--tw-ring-color': 'rgba(84, 142, 199, 0.5)' } as React.CSSProperties}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:border-[#548EC7] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ '--tw-ring-color': 'rgba(84, 142, 199, 0.5)' } as React.CSSProperties}
                                />
                            </div>

                            <div className="mt-1">
                                <button
                                    formAction={login}
                                    className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white h-11 px-4 py-2 w-full bg-[#548EC7] hover:bg-[#6ba0d4] active:bg-[#4a7db3] shadow-md hover:shadow-lg"
                                >
                                    Sign in to Dashboard
                                </button>
                            </div>
                        </form>
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        By continuing, you agree to Trucker&apos;sCall&apos;s{' '}
                        <a href="#" className="hover:underline" style={{ color: '#548EC7' }}>Terms</a> and{' '}
                        <a href="#" className="hover:underline" style={{ color: '#548EC7' }}>Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </>
    )
}
