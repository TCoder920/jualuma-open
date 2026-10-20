/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

'use client'

import { APP_URL } from '@/lib/constants'
import Link from 'next/link'

export default function FeatureRequestPage() {
  return (
    <div className="pb-12">
      <section className="py-12 md:py-16 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl mb-5">Help shape what Jualuma builds next.</h1>
        <p className="text-lg text-text-secondary">
          We prioritize requests that improve clarity, control, and trust in financial decision-making.
        </p>
      </section>

      <section className="mb-10">
        <div className="glass-panel">
          <h2 className="text-3xl mb-3">Submit a request</h2>
          <p className="text-text-secondary mb-6">
            Share your workflow gap, desired outcome, and who benefits. Product and engineering review requests continuously.
          </p>
          <div className="space-y-3">
            <a href={`${APP_URL}/support/tickets/new`} target="_blank" rel="noreferrer" className="btn w-full text-center">Submit via Support Portal</a>
            <Link href="/contact?type=feature-request" className="btn btn-secondary w-full text-center">Contact Feature Team</Link>
          </div>
        </div>
      </section>

      <section className="glass-panel text-center">
        <h2 className="text-3xl mb-4">What makes a high-impact request?</h2>
        <p className="text-text-secondary max-w-2xl mx-auto mb-0">
          Include the problem, current workaround, and expected result. Requests with clear business impact and reproducible scenarios move faster.
        </p>
      </section>
    </div>
  )
}
