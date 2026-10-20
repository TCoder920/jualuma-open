'use client'

import { FormEvent, useMemo, useState } from 'react'
import { motion } from '@/lib/motion'

type RequestType = 'general_support' | 'feature_request'

type ContactFormState = {
  name: string
  email: string
  subject: string
  message: string
}

const initialFormState: ContactFormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

function getRequestTypeFromLocationSearch(): RequestType {
  if (typeof window === 'undefined') return 'general_support'
  return new URLSearchParams(window.location.search).get('type') === 'feature-request'
    ? 'feature_request'
    : 'general_support'
}

export default function ContactPage() {
  const [requestType] = useState<RequestType>(() => getRequestTypeFromLocationSearch())

  const [formState, setFormState] = useState<ContactFormState>({
    ...initialFormState,
    subject: requestType === 'feature_request' ? 'Feature request' : '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const title = useMemo(
    () => (requestType === 'feature_request' ? 'Contact Feature Team' : 'Contact Us'),
    [requestType],
  )

  const subtitle = useMemo(
    () => (
      requestType === 'feature_request'
        ? 'Share your feature request and product context. The message will be sent directly to support for review.'
        : 'Send us your question and we will route it to support.'
    ),
    [requestType],
  )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formState,
        request_type: requestType,
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      setError(payload?.detail ?? 'Unable to send your message right now.')
      setSubmitting(false)
      return
    }

    setSuccess('Your message has been sent. Support will follow up by email.')
    setSubmitting(false)
    setFormState({
      ...initialFormState,
      subject: requestType === 'feature_request' ? 'Feature request' : '',
    })
  }

  return (
    <div className="pb-12 md:pb-16">
      <section className="py-12 md:py-16 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl mb-5">{title}</h1>
        <p className="text-lg text-text-secondary">{subtitle}</p>
      </section>

      <motion.section
        className="glass-panel max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.4 }}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="contact-label" htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                className="contact-input"
                type="text"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="contact-label" htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                className="contact-input"
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="contact-label" htmlFor="contact-subject">Subject</label>
            <input
              id="contact-subject"
              className="contact-input"
              type="text"
              value={formState.subject}
              onChange={(event) => setFormState((prev) => ({ ...prev, subject: event.target.value }))}
              required
            />
          </div>

          <div>
            <label className="contact-label" htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              className="contact-input contact-textarea"
              value={formState.message}
              onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
              required
            />
          </div>

          {error ? <p className="contact-status-error">{error}</p> : null}
          {success ? <p className="contact-status-success">{success}</p> : null}

          <button className="btn btn-lg w-full sm:w-auto" type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </motion.section>
    </div>
  )
}
