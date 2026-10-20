/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Updated 2025-12-08 20:31 CST by ChatGPT
import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type ProtectedRouteProps = {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-purple" />
      </div>
    )
  }

  if (!user) {
    const params = new URLSearchParams({ returnUrl: location.pathname + location.search })
    return <Navigate to={`/login?${params.toString()}`} replace />
  }

  if (!profile) {
    const params = new URLSearchParams({ returnUrl: location.pathname + location.search })
    return <Navigate to={`/login?${params.toString()}`} replace />
  }

  if (profile.status === 'pending_verification') {
    const params = new URLSearchParams({ returnUrl: location.pathname + location.search })
    return <Navigate to={`/verify-email?${params.toString()}`} replace />
  }

  if (profile.status === 'pending_plan_selection') {
    // Allow access to household invite page even without a plan
    if (location.pathname.startsWith('/household/accept-invite')) {
      return <>{children}</>
    }
    // Allow checkout success to verify payment
    if (location.pathname.startsWith('/checkout/success')) {
      return <>{children}</>
    }
    const params = new URLSearchParams({ returnUrl: location.pathname + location.search })
    return <Navigate to={`/plan-selection?${params.toString()}`} replace />
  }

  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-black text-red-500">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Account Suspended</h1>
          <p>Please contact support.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
