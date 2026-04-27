'use client'

import { useState } from 'react'
import { login } from './actions'
import { ArrowLeft, Eye } from 'lucide-react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#548EC7] text-white rounded-xl py-3.5 font-semibold hover:bg-[#6ca4db] transition duration-300 shadow-lg shadow-[#548EC7]/20 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Signing In...' : 'Sign In'}
    </button>
  )
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const [showPassword, setShowPassword] = useState(false)

  const error = searchParams?.error

  return (
    <div className="min-h-screen w-full max-w-full bg-[#111111] text-white overflow-x-hidden relative flex items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">

      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle,_rgba(255,255,255,0.08)_1px,_transparent_1px)] bg-[length:4px_4px]" />

      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 xl:gap-14 items-center relative z-10 overflow-hidden">

        {/* LEFT SIDE */}
        <div className="max-w-xl mx-auto md:mx-0 w-full">

          <Link
            href="https://www.truckerscall.com/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-5 sm:mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-serif tracking-wide">
              Trucker&apos;sCall
            </h1>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[72px] font-black leading-[0.92] uppercase tracking-tight mb-6 sm:mb-8">
            The Fleet <br />
            Management <br />
            Intelligence
          </h2>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <form action={login} className="space-y-3 max-w-md w-full">

            <input
              id="email"
              name="email"
              type="email"
              placeholder="dispatcher@truckerscall.com"
              required
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-5 py-3.5 outline-none text-sm placeholder:text-gray-500 focus:border-[#548EC7]/60 transition"
            />

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-5 py-3.5 pr-14 outline-none text-sm placeholder:text-gray-500 focus:border-[#548EC7]/60 transition"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-sm mt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300">
                <input
                  type="checkbox"
                  className="accent-[#548EC7]"
                />
                Keep me logged in
              </label>

              <button
                type="button"
                className="text-[#548EC7] hover:text-white transition underline underline-offset-4 whitespace-nowrap"
              >
                Forgot password?
              </button>
            </div>

            <SubmitButton />

          </form>
        </div>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex items-center justify-center relative">
          <div className="relative w-[280px] sm:w-[340px] md:w-[380px] lg:w-[440px] xl:w-[520px] h-[280px] sm:h-[340px] md:h-[380px] lg:h-[440px] xl:h-[520px]">

            <div className="absolute inset-0 bg-[#548EC7]/10 blur-3xl rounded-full" />

            <div
              className="absolute inset-0 overflow-hidden border border-white/10 shadow-2xl"
              style={{
                clipPath:
                  'path("M141.5 61.5C216 -7.5 359.5 -24.5 440 52.5C520.5 129.5 638.5 110.5 612.5 233C586.5 355.5 493.5 341.5 468 431C442.5 520.5 354.5 645.5 222 592C89.5 538.5 86.5 420 39.5 365.5C-7.5 311 6.5 183 82 131.5C157.5 80 67 130.5 141.5 61.5Z")',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1616432043562-3671ea2e5242?q=80&w=1400&auto=format&fit=crop"
                alt="fleet"
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
