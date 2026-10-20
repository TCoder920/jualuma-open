/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import type { MetadataRoute } from 'next'

const BASE_URL = 'https://jualuma.com'

const ROUTES = [
  '',
  '/about',
  '/contact',
  '/developer-sdk',
  '/developers',
  '/feature-request',
  '/features',
  '/legal/ai-disclaimer',
  '/legal/license',
  '/legal/privacy',
  '/legal/terms',
  '/marketplace',
  '/pricing',
  '/support',
]

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.NEXT_PUBLIC_SITE_ENV !== 'prod') {
    return []
  }

  const now = new Date()
  return ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}
