/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Updated 2025-12-09 17:45 CST by ChatGPT
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import './styles/theme.css'

const startupLogoUrl = `${import.meta.env.BASE_URL}assets/jualuma-logo-main.png`

type BootstrapStatus = {
  stage: string
  mounted?: boolean
  error?: string
}

type AppModule = {
  default: React.ComponentType
}

type ThemeModule = {
  ThemeProvider: React.ComponentType<{ children: React.ReactNode }>
}

type ToastModule = {
  ToastProvider: React.ComponentType<{ children: React.ReactNode }>
}

type ErrorBoundaryModule = {
  ErrorBoundary: React.ComponentType<{ children: React.ReactNode }>
}

declare global {
  interface Window {
    __JUALUMA_BOOTSTRAP__?: BootstrapStatus
    __JUALUMA_BOOTSTRAP_WATCHDOG__?: number
  }
}

const setBootstrapStatus = (status: BootstrapStatus) => {
  window.__JUALUMA_BOOTSTRAP__ = status
}

const renderStartupShell = (rootElement: HTMLElement, message = 'Loading JuaLuma...') => {
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;background:#050B14;color:#E2E8F0;font-family:system-ui,sans-serif;">
      <div style="width:min(100%,360px);display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;">
        <img src="${startupLogoUrl}" alt="JuaLuma" style="width:84px;height:84px;object-fit:contain;" />
        <div style="font-size:18px;font-weight:600;letter-spacing:0.01em;">${message}</div>
      </div>
    </div>
  `
}

const renderStartupFailure = (rootElement: HTMLElement, error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error)
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#050B14;color:#E2E8F0;font-family:system-ui,sans-serif;">
      <div style="width:min(100%,420px);display:flex;flex-direction:column;gap:16px;align-items:flex-start;">
        <img src="${startupLogoUrl}" alt="JuaLuma" style="width:72px;height:72px;object-fit:contain;" />
        <div style="font-size:20px;font-weight:700;">JuaLuma failed to start.</div>
        <div style="font-size:14px;line-height:1.5;color:#CBD5E1;">A startup dependency failed before the app could render.</div>
        <pre style="margin:0;width:100%;white-space:pre-wrap;word-break:break-word;border-radius:16px;background:rgba(15,23,42,0.9);padding:16px;font-size:12px;line-height:1.5;color:#FCA5A5;">${detail}</pre>
      </div>
    </div>
  `
}

const loadAppModules = async (): Promise<
  [AppModule, ThemeModule, ToastModule, ErrorBoundaryModule]
> => {
  return Promise.all([
    import('./App'),
    import('./hooks/useTheme'),
    import('./components/ui'),
    import('./components/ErrorBoundary'),
  ])
}

const renderApp = async (rootElement: HTMLElement) => {
  renderStartupShell(rootElement)
  setBootstrapStatus({ stage: 'render_requested', mounted: false })

  const [
    { default: App },
    { ThemeProvider },
    { ToastProvider },
    { ErrorBoundary },
  ] = await loadAppModules()

  setBootstrapStatus({ stage: 'modules_loaded', mounted: false })

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

const mountApp = async () => {
  const rootElement = document.getElementById('root')
  if (!rootElement) return false
  setBootstrapStatus({ stage: 'root_found', mounted: false })
  await renderApp(rootElement)
  return true
}

const bootstrap = async () => {
  const handleBootstrapFailure = (error: unknown) => {
    console.error('App bootstrap failed:', error)
    setBootstrapStatus({
      stage: 'bootstrap_failed',
      mounted: false,
      error: error instanceof Error ? error.message : String(error),
    })
    const rootElement = document.getElementById('root')
    if (rootElement) {
      renderStartupFailure(rootElement, error)
      return
    }
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#050B14;color:#E2E8F0;font-family:system-ui,sans-serif;text-align:center;">App failed to start.</div>'
  }

  const rootElement = document.getElementById('root')
  if (rootElement) {
    renderStartupShell(rootElement)
  }

  setBootstrapStatus({ stage: 'bootstrap_started', mounted: false })

  if (!(await mountApp())) {
    window.addEventListener(
      'DOMContentLoaded',
      async () => {
        try {
          if (!(await mountApp())) {
            throw new Error('App bootstrap failed: missing #root mount node.')
          }
        } catch (error) {
          handleBootstrapFailure(error)
        }
      },
      { once: true },
    )
  }

  window.__JUALUMA_BOOTSTRAP_WATCHDOG__ = window.setTimeout(() => {
    if (window.__JUALUMA_BOOTSTRAP__?.mounted) return

    const rootElement = document.getElementById('root')
    if (!rootElement) return

    setBootstrapStatus({
      stage: 'watchdog_timeout',
      mounted: false,
      error: 'App did not complete startup in time.',
    })
    renderStartupShell(rootElement, 'JuaLuma is still starting...')
  }, 4000)
}

void bootstrap().catch((error) => {
  console.error('App bootstrap failed:', error)
  setBootstrapStatus({
    stage: 'bootstrap_failed',
    mounted: false,
    error: error instanceof Error ? error.message : String(error),
  })
  const rootElement = document.getElementById('root')
  if (rootElement) {
    renderStartupFailure(rootElement, error)
    return
  }
  document.body.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#050B14;color:#E2E8F0;font-family:system-ui,sans-serif;text-align:center;">App failed to start.</div>'
})

// Force Unregister Service Worker to fix loading issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  })
}

// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').then(
//       (registration) => {
//         console.log('ServiceWorker registration successful with scope: ', registration.scope)
//       },
//       (err) => {
//         console.log('ServiceWorker registration failed: ', err)
//       },
//     )
//   })
// }
