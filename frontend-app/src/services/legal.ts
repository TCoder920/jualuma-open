/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import { api } from './api'
import { AgreementAcceptanceInput } from '../types/legal'

export const legalService = {
  acceptAgreements: async (agreements: AgreementAcceptanceInput[]) => {
    const response = await api.post('/legal/accept', { agreements })
    return response.data as { accepted: number }
  },
}
