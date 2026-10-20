/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Marketing site layout. Last modified: 2026-02-02 18:50 CST
import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { GalaxyWaveBackground } from '../components/GalaxyWaveBackground'

const SITE_ENV = process.env.NEXT_PUBLIC_SITE_ENV ?? 'dev'
const IS_PROD_INDEXING = SITE_ENV === 'prod'

export const metadata: Metadata = {
  metadataBase: new URL('https://jualuma.com'),
  title: 'Jualuma - Master Your Finances',
  description: 'The ultimate financial aggregation and tracking platform.',
  robots: {
    index: IS_PROD_INDEXING,
    follow: IS_PROD_INDEXING,
    nocache: false,
    googleBot: {
      index: IS_PROD_INDEXING,
      follow: IS_PROD_INDEXING,
      noimageindex: false,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    url: 'https://jualuma.com',
    siteName: 'Jualuma',
    title: 'Master Your Finances',
    description: 'Jualuma gives you one place to connect accounts, track progress, and make better financial decisions.',
    images: [
      {
        url: '/assets/jualuma-logo-main.png',
        width: 1024,
        height: 1024,
        alt: 'Jualuma logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Master Your Finances',
    description: 'Jualuma gives you one place to connect accounts, track progress, and make better financial decisions.',
    images: ['/assets/jualuma-logo-main.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: ['/favicon-32x32.png'],
    apple: [{ url: '/assets/jualuma-logo-main.png', sizes: '1024x1024', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="marketing-shell min-h-screen flex flex-col bg-bg-primary text-text-primary">
        <div className="marketing-animated-shell relative isolate flex min-h-screen flex-col">
          <GalaxyWaveBackground />
          <Navbar />
          <main className="relative z-10 flex-grow pt-20">
            <div className="container mx-auto px-6">
              {children}
            </div>
          </main>
          <Footer />
          <p><a href="https://github.com/TCoder920/jualuma-open">Source code (AGPLv3)</a> · No warranty</p>
        </div>
      </body>
    </html>
  )
}
