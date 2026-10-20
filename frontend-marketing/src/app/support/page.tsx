'use client'

import { motion } from '@/lib/motion'
import { AppAuthLink } from '@/components/AppAuthLink'
import Link from 'next/link'

const faqs = [
  {
    q: 'Is my bank data safe?',
    a: 'Yes. Jualuma never stores bank login credentials. Account linking is handled through secure providers and read-only access patterns.',
  },
  {
    q: 'Do you sell my data?',
    a: 'No. We do not sell your personal or financial data. Your data is used only to deliver the product and support you.',
  },
  {
    q: 'Is my data used to train AI?',
    a: 'No. Jualuma routes requests through configured runtime models (`gpt-oss-120b` and `gemini-2.5-flash`) and does not use your data to train foundation models.',
  },
  {
    q: 'How does the AI assistant answer questions?',
    a: 'It analyzes categorized transaction/account context plus supported uploaded files to generate specific answers, not generic finance content.',
  },
  {
    q: 'How does AI fallback and reset timing work?',
    a: 'Paid usage defaults to `gemini-2.5-flash` and falls back to `gpt-oss-120b` when paid premium capacity is exhausted for the period. Usage is shown as `AI usage this period` with a billing-cycle reset date.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel from account billing settings and keep paid access until the current period ends.',
  },
  {
    q: 'Do you support developer integrations?',
    a: 'Yes. Request access through the developer program and our team will review scope, security posture, and fit before approval.',
  },
]

export default function SupportPage() {
  return (
    <div className="pb-12">
      <section className="py-12 md:py-16 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl mb-5">Need help getting the most from your financial data?</h1>
        <p className="text-lg text-text-secondary">
          Find answers quickly, then escalate to support when you need account-specific help.
        </p>
      </section>

      <section id="faq" className="grid md:grid-cols-2 gap-5 mb-10">
        {faqs.map((item, index) => (
          <motion.article
            key={item.q}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="glass-panel"
          >
            <h2 className="text-2xl mb-3">{item.q}</h2>
            <p className="text-text-secondary mb-0">{item.a}</p>
          </motion.article>
        ))}
      </section>

      <section className="glass-panel text-center">
        <h2 className="text-3xl md:text-4xl mb-4">Still need assistance?</h2>
        <p className="text-text-secondary mb-7 max-w-2xl mx-auto">
          Log in for ticket support or contact us directly for onboarding and product issues.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <AppAuthLink appPath="/login" className="btn">Log In to Submit Ticket</AppAuthLink>
          <Link href="/contact" className="btn btn-secondary">Contact Us</Link>
        </div>
      </section>
    </div>
  )
}
