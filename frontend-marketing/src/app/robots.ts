/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const isProdIndexing = process.env.NEXT_PUBLIC_SITE_ENV === 'prod'

  if (!isProdIndexing) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      host: 'https://jualuma.com',
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://jualuma.com/sitemap.xml',
    host: 'https://jualuma.com',
  }
}
