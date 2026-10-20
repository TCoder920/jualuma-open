/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

export const LEGAL_AGREEMENTS = {
  termsOfService: {
    key: 'terms_of_service',
    version: '2025-01-15',
    url: '/legal/terms',
  },
  privacyPolicy: {
    key: 'privacy_policy',
    version: '2025-01-15',
    url: '/legal/privacy',
  },
  developerAgreement: {
    key: 'developer_agreement',
    version: '2025-01-15',
    url: '/legal/terms',
  },
  dataSharingConsent: {
    key: 'data_sharing_consent',
    version: '2026-01-18',
  },
  aiPrivacyUserAgreement: {
    key: 'ai_privacy_user_agreement',
    version: '2025-01-15',
  },
} as const
