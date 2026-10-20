import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'

type ContactPayload = {
  name: string
  email: string
  subject: string
  message: string
  request_type: 'general_support' | 'feature_request'
}

export async function POST(request: Request) {
  let payload: ContactPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ detail: 'Invalid request payload.' }, { status: 400 })
  }

  const requiredFields: Array<keyof ContactPayload> = ['name', 'email', 'subject', 'message', 'request_type']
  const hasMissingField = requiredFields.some((field) => {
    const value = payload[field]
    return typeof value !== 'string' || value.trim().length === 0
  })

  if (hasMissingField) {
    return NextResponse.json({ detail: 'All fields are required.' }, { status: 400 })
  }

  if (!payload.email.includes('@')) {
    return NextResponse.json({ detail: 'A valid email is required.' }, { status: 400 })
  }

  if (!['general_support', 'feature_request'].includes(payload.request_type)) {
    return NextResponse.json({ detail: 'Invalid request type.' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${API_URL}/api/support/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json(
      { detail: 'Support service is temporarily unavailable. Please try again in a few minutes.' },
      { status: 503 },
    )
  }

  const responseData = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    const detail = typeof responseData?.detail === 'string'
      ? responseData.detail
      : 'Unable to send your message right now.'
    return NextResponse.json({ detail }, { status: upstream.status })
  }

  return NextResponse.json(responseData, { status: 202 })
}
