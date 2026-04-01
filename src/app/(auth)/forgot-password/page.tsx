'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Truck, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim()) {
            setError('Please enter your email address.')
            return
        }

        setError('')
        setIsLoading(true)

        try {
            const supabase = createClient()
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            })

            if (resetError) {
                setError(resetError.message)
            } else {
                setSuccess(true)
            }
        } catch {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 relative">
            <Link href="/login" className="absolute top-8 left-8 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Login
            </Link>

            <div className="w-full max-w-sm space-y-8">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#548EC7' }}>
                        <Truck className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight">Trucker&apos;sCall</h2>
                        <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Fleet Management Platform</p>
                    </div>
                </div>

                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm space-y-6">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-xl font-bold">Check your email</h1>
                                <p className="text-sm text-muted-foreground">
                                    We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your inbox.
                                </p>
                            </div>
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center text-sm font-medium transition-colors text-[#548EC7] hover:underline"
                            >
                                Back to login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 text-center">
                                <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
                                <p className="text-sm text-muted-foreground">
                                    Enter your email address and we&apos;ll send you a reset link.
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="grid gap-2">
                                    <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="you@company.com"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:border-[#548EC7] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-white h-11 px-4 py-2 w-full bg-[#548EC7] hover:bg-[#6ba0d4] active:bg-[#4a7db3] shadow-md hover:shadow-lg"
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>

                            <p className="text-center text-sm text-muted-foreground">
                                Remember your password?{' '}
                                <Link href="/login" className="hover:underline font-medium" style={{ color: '#548EC7' }}>
                                    Sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
