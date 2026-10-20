/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

const AUTH_ACCESS_ERROR_MESSAGE =
  'Unable to verify your access right now. Please sign in and try again.'
const ACCESS_DENIED_ERROR_MESSAGE =
  'You do not have permission to perform this action.'
const GENERIC_REQUEST_ERROR_MESSAGE =
  'Request could not be completed right now. Please try again.'

export type NormalizedApiError = {
  message: string
  code?: string
}

const FRIENDLY_STATUS_MESSAGES: Record<number, string> = {
  400: 'We could not process that request. Please review your input and try again.',
  404: 'We could not find what you requested.',
  408: 'The request timed out. Please try again.',
  409: 'This action conflicts with current data. Refresh and try again.',
  413: 'File is too large. Maximum supported size is 20 MB.',
  415: 'Unsupported file format. Please choose a supported file type.',
  422: 'Some input is invalid. Please review and try again.',
  429: 'Too many requests right now. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'Service is temporarily unavailable. Please try again shortly.',
  503: 'Service is temporarily unavailable. Please try again shortly.',
  504: 'The service took too long to respond. Please try again.',
}

const isTechnicalMessage = (message: string): boolean => {
  const normalized = message.trim().toLowerCase()
  return (
    /^request failed with status(?: code)? \d{3}$/i.test(message.trim()) ||
    normalized === 'network error' ||
    normalized.includes('timeout') ||
    normalized.startsWith('error: request failed')
  )
}

const fallbackMessageForStatus = (status: number | undefined): string => {
  if (typeof status === 'number' && FRIENDLY_STATUS_MESSAGES[status]) {
    return FRIENDLY_STATUS_MESSAGES[status]
  }
  return GENERIC_REQUEST_ERROR_MESSAGE
}

const appendErrorCode = (message: string, code?: string): string => {
  if (!code) return message
  if (message.includes(code)) return message
  return `${message} (Code: ${code})`
}

const extractErrorCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as {
    code?: unknown
    detail?: { code?: unknown } | string | null
  }
  if (typeof candidate.code === 'string' && candidate.code.trim()) {
    return candidate.code.trim()
  }
  if (
    candidate.detail &&
    typeof candidate.detail === 'object' &&
    typeof candidate.detail.code === 'string' &&
    candidate.detail.code.trim()
  ) {
    return candidate.detail.code.trim()
  }
  return undefined
}

const extractErrorMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as {
    message?: unknown
    error?: unknown
    detail?: unknown
  }

  if (typeof candidate.message === 'string') return candidate.message
  if (typeof candidate.error === 'string') return candidate.error
  if (typeof candidate.detail === 'string') return candidate.detail
  if (
    candidate.detail &&
    typeof candidate.detail === 'object' &&
    'message' in candidate.detail &&
    typeof (candidate.detail as { message?: unknown }).message === 'string'
  ) {
    return (candidate.detail as { message: string }).message
  }

  return undefined
}

export const normalizeApiError = (
  status: number | undefined,
  raw: unknown,
): NormalizedApiError => {
  const code = extractErrorCode(raw)

  if (status === 401) {
    return { message: appendErrorCode(AUTH_ACCESS_ERROR_MESSAGE, code), code }
  }
  if (status === 403) {
    return { message: appendErrorCode(ACCESS_DENIED_ERROR_MESSAGE, code), code }
  }

  const extractedMessage = extractErrorMessage(raw)
  if (typeof extractedMessage !== 'string') {
    const fallback = fallbackMessageForStatus(status)
    return { message: appendErrorCode(fallback, code), code }
  }

  const message = extractedMessage.trim()
  if (!message) {
    const fallback = fallbackMessageForStatus(status)
    return { message: appendErrorCode(fallback, code), code }
  }
  if (/<(?:!doctype\s+html|html|body)\b/i.test(message)) {
    const fallback = fallbackMessageForStatus(status)
    return { message: appendErrorCode(fallback, code), code }
  }
  if (isTechnicalMessage(message)) {
    const fallback = fallbackMessageForStatus(status)
    return { message: appendErrorCode(fallback, code), code }
  }
  return { message: appendErrorCode(message, code), code }
}

export const normalizeApiErrorMessage = (
  status: number | undefined,
  raw: unknown,
): string => normalizeApiError(status, raw).message
