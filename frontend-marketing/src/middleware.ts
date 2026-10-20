import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const BOT_UA_PATTERN =
  /(bot|crawler|spider|slurp|bingpreview|googlebot|bingbot|duckduckbot|yandexbot|baiduspider|gptbot|chatgpt-user|google-extended|facebookexternalhit|linkedinbot|twitterbot|applebot|bytespider)/i

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SITE_ENV === 'prod') {
    return NextResponse.next()
  }

  const userAgent = request.headers.get('user-agent') ?? ''
  if (BOT_UA_PATTERN.test(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
