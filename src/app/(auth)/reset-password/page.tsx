'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Truck, ArrowLeft, KeyRound } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setError('')
        setIsLoading(true)

        try {
            const supabase = createClient()
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

            if (updateError) {
                setError(updateError.message)
            } else {
                router.push('/dashboard')
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
                    <div className="space-y-2 text-center">
                        <div className="flex justify-center mb-2">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <KeyRound className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
                        <p className="text-sm text-muted-foreground">
                            Choose a strong password for your account.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="grid gap-2">
                            <label htmlFor="newPassword" className="text-sm font-medium leading-none">New Password</label>
                            <input
                                id="newPassword"
                                type="password"
                                placeholder="Minimum 8 characters"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:border-[#548EC7] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                placeholder="Repeat new password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:border-[#548EC7] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-white h-11 px-4 py-2 w-full bg-[#548EC7] hover:bg-[#6ba0d4] active:bg-[#4a7db3] shadow-md hover:shadow-lg"
                        >
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
