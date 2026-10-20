/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

export type DateInput = string | number | Date

const toDate = (value: DateInput): Date => {
  return value instanceof Date ? value : new Date(value)
}

export const formatDate = (
  value: DateInput,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  return toDate(value).toLocaleDateString(undefined, { timeZone, ...options })
}

export const formatDateTime = (
  value: DateInput,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  return toDate(value).toLocaleString(undefined, { timeZone, ...options })
}

export const formatTime = (
  value: DateInput,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  return toDate(value).toLocaleTimeString(undefined, { timeZone, ...options })
}
