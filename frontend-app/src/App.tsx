/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Updated 2025-01-25 18:30 CST by Antigravity

import { useEffect } from 'react'
import { BrowserRouter, HashRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { SWRConfig } from 'swr'
import { AuthProvider } from './hooks/useAuth'
import { CookieConsentBanner } from './components/CookieConsentBanner'
// Layouts
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Public Pages
import NotFound from './pages/NotFound'

// Auth Pages
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { VerifyEmail } from './pages/VerifyEmail'
import { PricingRedirect } from './pages/PricingRedirect'
import { ResetPassword } from './pages/ResetPassword'
import { DeveloperAuth } from './pages/developers/DeveloperAuth'
import { PlanSelection } from './pages/PlanSelection'

// Protected App Pages
import Dashboard from './pages/Dashboard'
import FinancialAnalysis from './pages/FinancialAnalysis'
import { Transactions } from './pages/Transactions'
import { ConnectAccounts } from './pages/ConnectAccounts'
import AIAssistant from './pages/AIAssistant'
import { Settings } from './pages/Settings'
import { Support } from './pages/Support'
import { TicketDetail } from './pages/TicketDetail'
import { HouseholdPage } from './pages/Household/HouseholdPage'
import JoinHousehold from './pages/JoinHousehold'
import { DeveloperDashboard } from './pages/developers/DeveloperDashboard'
import { CheckoutSuccess } from './pages/CheckoutSuccess'
import { CheckoutStart } from './pages/CheckoutStart'
import Maintenance from './pages/Maintenance'
import { attachNativeDeepLinkListener } from './services/deepLinkRouting'
import { initializeClientObservability } from './services/clientObservability'
import { useAuth } from './hooks/useAuth'

function NativeDeepLinkHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    return attachNativeDeepLinkListener((route) => {
      navigate(route)
    })
  }, [navigate])

  return null
}

export function RootBootstrapRoute() {
  const { user, profile, loading, profileLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || profileLoading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!profile) {
      navigate('/login', { replace: true })
      return
    }

    if (profile.status === 'pending_verification') {
      navigate('/verify-email', { replace: true })
      return
    }

    if (profile.status === 'pending_plan_selection') {
      navigate('/plan-selection', { replace: true })
      return
    }

    navigate('/dashboard', { replace: true })
  }, [loading, navigate, profile, profileLoading, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-black text-slate-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-neon-blue" />
        <span>Loading JuaLuma...</span>
      </div>
    </div>
  )
}

function App() {
  const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'
  const Router = Capacitor.getPlatform() === 'web' ? BrowserRouter : HashRouter

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.__JUALUMA_BOOTSTRAP_WATCHDOG__) {
        window.clearTimeout(window.__JUALUMA_BOOTSTRAP_WATCHDOG__)
      }
      window.__JUALUMA_BOOTSTRAP__ = { stage: 'app_mounted', mounted: true }
    }

    let dispose: (() => void) | null = null
    let unmounted = false

    void initializeClientObservability().then((cleanup) => {
      if (unmounted) {
        cleanup()
        return
      }
      dispose = cleanup
    })

    return () => {
      unmounted = true
      if (dispose) {
        dispose()
      }
    }
  }, [])

  if (MAINTENANCE_MODE) {
    return <Maintenance />
  }

  return (
    <Router>
      <NativeDeepLinkHandler />
      <SWRConfig
        value={{
          // Avoid SWR retry storms when the backend rate limiter returns 429s.
          shouldRetryOnError: (error: unknown) => {
            const status =
              (error as { response?: { status?: number }; status?: number } | null)?.response
                ?.status ??
              (error as { status?: number } | null)?.status
            return status !== 429
          },
          errorRetryCount: 2,
          onErrorRetry: (error, _key, _config, revalidate, context) => {
            const status =
              (error as { response?: { status?: number }; status?: number } | null)?.response
                ?.status ??
              (error as { status?: number } | null)?.status
            if (status === 429 || context.retryCount >= 2) {
              return
            }
            const delayMs = Math.min(6000, 1000 * 2 ** context.retryCount)
            setTimeout(() => {
              void revalidate({ retryCount: context.retryCount })
            }, delayMs)
          },
          isPaused: () => typeof navigator !== 'undefined' && navigator.onLine === false,
          dedupingInterval: 1000,
        }}
      >
        <AuthProvider>
          <CookieConsentBanner />
          <Routes>
            {/* --- Root Redirect --- */}
            <Route path="/" element={<RootBootstrapRoute />} />

             {/* --- Auth Routes (Standalone) --- */}

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/plan-selection" element={<PlanSelection />} />
            <Route path="/pricing" element={<PricingRedirect />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/developers/login" element={<DeveloperAuth mode="login" />} />
            <Route path="/developers/signup" element={<DeveloperAuth mode="signup" />} />
            <Route path="/household/accept-invite" element={<JoinHousehold />} />

             {/* --- Application Routes (Protected Dashboard) --- */}
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="financial-analysis" element={<FinancialAnalysis />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="connect-accounts" element={<ConnectAccounts />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
              <Route path="settings" element={<Settings />} />
              <Route path="household" element={<HouseholdPage />} />
              <Route path="support" element={<Support />} />

              {/* Nested or Specific App Pages */}
              <Route path="support/tickets/:ticketId" element={<TicketDetail />} />
              <Route path="checkout/success" element={<CheckoutSuccess />} />
              <Route path="checkout/start" element={<CheckoutStart />} />
              <Route path="developers/dashboard" element={<DeveloperDashboard />} />

               {/* Legacy Redirects */}
              <Route path="developer-marketplace" element={<Navigate to="/developers/dashboard" replace />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />



          </Routes>
        </AuthProvider>
      </SWRConfig>
    </Router>
  )
}

export default App
