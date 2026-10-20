/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import { useMemo } from 'react'
import { useAuth } from './useAuth'

export const useUserTimeZone = (): string => {
  const { profile } = useAuth()
  return useMemo(() => {
    return (
      profile?.time_zone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC'
    )
  }, [profile?.time_zone])
}
