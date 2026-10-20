/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Updated 2026-01-20 03:40 CST by Antigravity
import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearCachedToken, getIdToken, MfaRequiredError } from './auth'
import { normalizeApiError } from './apiErrorMessages'

type ApiClientError = Error & {
  status?: number
  rawMessage?: string
  code?: string
}

// Accept both env naming conventions across dev/prod.
const envBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  import.meta.env.VITE_API_TARGET

const isDockerBackendHost = (candidate?: string): boolean => {
  if (!candidate) return false
  const trimmed = candidate.trim()
  if (!trimmed) return false

  try {
    const parsed = new URL(trimmed)
    return parsed.hostname === 'backend'
  } catch {
    // Handle bare hostnames like `backend` or `backend:8001`
    const hostOnly = trimmed.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
    return hostOnly === 'backend'
  }
}

// Docker local uses host `backend`; Cloud Run URLs like `jualuma-backend-...` must remain absolute.
const baseURL = envBase && !isDockerBackendHost(envBase) ? envBase.replace(/\/+$/, '') : '/api'

const api = axios.create({
  baseURL,
  timeout: 10000, // 10 second timeout
})

api.interceptors.request.use(
  async (config) => {
    const token = await getIdToken()
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const rawPayload = error.response?.data ?? error.message
    const normalized = normalizeApiError(status, rawPayload)
    const rawMessage =
      typeof rawPayload === 'string'
        ? rawPayload
        : JSON.stringify(rawPayload)

    if (status === 403 && (rawMessage === 'MFA_REQUIRED' || rawMessage === 'MFA_PASSKEY_REQUIRED')) {
      clearCachedToken()
      try {
        window.dispatchEvent(
          new CustomEvent('mfa-required', { detail: { reason: rawMessage } }),
        )
      } catch {
        // no-op
      }
      return Promise.reject(
        new MfaRequiredError(rawMessage === 'MFA_PASSKEY_REQUIRED' ? 'passkey' : 'totp'),
      )
    }

    if (status === 401) {
      clearCachedToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    const normalizedError: ApiClientError = new Error(normalized.message)
    normalizedError.name = 'ApiClientError'
    normalizedError.status = status
    normalizedError.rawMessage = rawMessage
    normalizedError.code = normalized.code
    return Promise.reject(normalizedError)
  },
)

export { api }
