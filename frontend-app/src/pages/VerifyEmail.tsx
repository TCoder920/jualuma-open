/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

/**
 * CORE PURPOSE: Email verification page for user onboarding.
 * LAST MODIFIED: 2025-12-21 17:05 CST
 */
import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { requestEmailCode, verifyEmailCode } from '../services/auth'
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking'
import { BrandMark } from '../components/BrandMark'
import { ATTRIBUTION_PRIMARY } from '../constants/branding'

export const VerifyEmail = () => {
    const { user, profile, refetchProfile } = useAuth()
    const navigate = useNavigate()
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)

    // Track when user lands on email verification page
    useEffect(() => {
        eventTracking.trackSignupFunnel(SignupFunnelEvent.EMAIL_VERIFICATION_STARTED)
    }, [])

    const [params] = useSearchParams()
    const returnUrl = params.get('returnUrl')
    const plan = params.get('plan')

    useEffect(() => {
        // If user has completed verification, redirect to pricing or dashboard
        // ProtectedRoute will handle the final destination based on status
        // BUT we want to preserve returnUrl if present

        const nextParams = new URLSearchParams()
        if (returnUrl) {
            nextParams.set('returnUrl', returnUrl)
        }
        if (plan) {
            nextParams.set('plan', plan)
        }
        const queryString = nextParams.toString()

        // Prioritize household invites - bypass pricing check
        if (returnUrl && returnUrl.includes('/household/accept-invite')) {
             navigate(returnUrl, { replace: true })
             return
        }

        if (profile?.status === 'pending_plan_selection') {
            navigate(`/plan-selection${queryString ? `?${queryString}` : ''}`, { replace: true })
        } else if (profile?.status === 'active') {
            // If active, go to returnUrl if exists, else dashboard
            navigate(returnUrl || '/dashboard', { replace: true })
        }
        // If status is 'pending_verification', stay on this page
    }, [profile, navigate, returnUrl])

    const handleSendCode = async () => {
        if (!user?.email) return
        setSending(true)
        setMessage('')
        setError('')
        try {
            await requestEmailCode(user.email)
            setMessage('A new verification code has been sent to your email. Please check your inbox and spam folder. The code will expire in 10 minutes.')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(`Unable to send verification code: ${errorMessage}. Please try again or contact support if the issue persists.`)
        } finally {
            setSending(false)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await verifyEmailCode(code)
            await refetchProfile()
            // Track successful verification
            eventTracking.trackSignupFunnel(SignupFunnelEvent.EMAIL_VERIFICATION_COMPLETED)
            // Navigation will be handled by the effect or ProtectedRoute once profile updates,
            // but we can force it or let it settle.
            // Profile status should update to 'pending_plan_selection'.
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message.includes('Invalid') || err.message.includes('expired')
                    ? 'Invalid or expired code. Please request a new code and try again.'
                    : err.message
                )
            } else {
                setError('Verification failed. Please check your code and try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-midnight-black flex items-center justify-center p-4 sm:p-6">
            <div className="max-w-md w-full glass-panel p-6 rounded-xl space-y-6 sm:p-8">
                <div className="flex flex-col items-center gap-3">
                    <BrandMark />
                    <p className="text-center text-xs text-slate-400">
                        {ATTRIBUTION_PRIMARY}
                    </p>
                </div>

                <h2 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-purple-500 bg-clip-text text-transparent">
                    Verify Your Email
                </h2>

                <p className="text-slate-300 break-words">
                    To secure your account, please enter the verification code sent to your email:
                    <span className="mt-1 block break-all font-mono text-neon-blue">{user?.email}</span>
                </p>

                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-400 break-words">
                    <strong>Haven&apos;t received your code?</strong>
                    <ul className="mt-2 ml-4 space-y-1 list-disc text-xs">
                        <li>Check your spam/junk folder</li>
                        <li>Ensure {user?.email} is correct</li>
                        <li>Wait 1-2 minutes for delivery</li>
                        <li>Click &quot;Resend Code&quot; below if needed</li>
                    </ul>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500 break-words">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-500 break-words">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Verification Code (6 digits)
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-center text-lg tracking-[0.35em] text-white outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-neon-blue"
                            placeholder="123456"
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.length < 6}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying...' : 'Validate'}
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-white/5">
                    <button
                        onClick={handleSendCode}
                        disabled={sending}
                        className="text-sm text-slate-400 hover:text-neon-blue transition-colors"
                    >
                        {sending ? 'Sending...' : 'Resend Code'}
                    </button>
                </div>
            </div>
        </div>
    )
}
