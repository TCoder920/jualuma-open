/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

export type AgreementAcceptanceInput = {
  agreement_key: string
  agreement_version?: string
  acceptance_method?: string
  presented_at?: string
  metadata?: Record<string, unknown>
}
