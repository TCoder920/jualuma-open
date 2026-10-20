/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

'use client'

import Link from 'next/link'
import { motion, type Variants } from '@/lib/motion'
import { AppAuthLink } from '@/components/AppAuthLink'
import { Bot, Cable, LineChart, Link2, Mail, ShieldCheck, Target, Users2 } from 'lucide-react'

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const howToSteps = [
  {
    title: 'Connect your full money picture',
    detail: 'Link banks, brokerages, web3 wallets, cryptocurrency exchanges, and manual assets so your cash, debt, and investments are visible in one place.',
    icon: Link2,
  },
  {
    title: 'Read your baseline in minutes',
    detail: 'Use net worth, cash flow, budget status, and linked account metrics to quickly understand where you stand right now.',
    icon: LineChart,
  },
  {
    title: 'Set practical targets',
    detail: 'Track debt payoff, emergency savings, and spending categories so your goals are measurable and progress is visible.',
    icon: Target,
  },
  {
    title: 'Run a weekly decision check',
    detail: 'Use your AI assistant to review trend changes, adjust spending, rebalance priorities, and stay aligned with your financial plan.',
    icon: Bot,
  },
]

const capabilityCards = [
  {
    title: 'Clarity over guesswork',
    body: 'Jualuma turns fragmented account data into one timeline so you can see what changed and why.',
  },
  {
    title: 'Actionable guidance',
    body: 'AI insights explain spending shifts, anomalies, and recurring patterns so next actions are practical.',
  },
  {
    title: 'Personal and household workflows',
    body: 'Use independent or family contexts with role-aware visibility and shared financial planning workflows.',
  },
]

const trustPoints = [
  {
    text: 'Connections are read-only through supported providers',
    icon: Cable,
    iconClassName: 'marketing-story-icon-connect',
  },
  {
    text: 'You stay in control of what you connect and what you remove',
    icon: Target,
    iconClassName: 'marketing-story-icon-balance',
  },
  {
    text: 'Jualuma does not move money on your behalf',
    icon: ShieldCheck,
    iconClassName: 'marketing-story-icon-ai',
  },
  {
    text: 'Your data is used to run your experience, not to train foundation models',
    icon: Bot,
    iconClassName: 'marketing-story-icon-ai',
  },
]

export default function Home() {
  return (
    <div className="marketing-home-root marketing-home-full-bleed">
      <div className="relative z-10 px-6 pb-8 md:pb-10">
        <motion.section
          className="marketing-hero-wrap max-w-[1460px] mx-auto"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.h1 variants={item} className="marketing-hero-title">Get total clarity across your entire financial life.</motion.h1>
          <motion.p variants={item} className="marketing-hero-subtitle">
            Jualuma gives individuals one place to connect accounts, understand net worth and cash flow, and follow a clear workflow that turns financial data into confident decisions.
          </motion.p>
          <motion.div variants={item} className="marketing-hero-ctas">
            <AppAuthLink appPath="/signup" className="btn btn-lg marketing-primary-btn">Start Free Trial</AppAuthLink>
            <Link href="/features" className="btn btn-lg marketing-secondary-btn">Explore Features</Link>
          </motion.div>

          <motion.div variants={item} className="marketing-preview-panel">
            <h2>Your Money Command Panel</h2>
            <p>Core indicators for fast financial check-ins and practical weekly adjustments.</p>
            <div className="marketing-metric-grid">
              <motion.article className="marketing-metric-card" whileHover={{ y: -5, scale: 1.01 }} transition={{ duration: 0.2 }}>
                <h3>Net Worth</h3>
                <p className="marketing-metric-value positive">$638,240</p>
                <p className="marketing-metric-detail">Assets $1.00M • Liabilities $415K</p>
                <p className="marketing-metric-footnote">Up $12.7k in last 30 days</p>
              </motion.article>

              <motion.article className="marketing-metric-card" whileHover={{ y: -5, scale: 1.01 }} transition={{ duration: 0.2, delay: 0.02 }}>
                <h3>Cash Flow</h3>
                <p className="marketing-metric-value positive">+$3,180</p>
                <p className="marketing-metric-detail">In $11,450 • Out $8,270</p>
              </motion.article>

              <motion.article className="marketing-metric-card" whileHover={{ y: -5, scale: 1.01 }} transition={{ duration: 0.2, delay: 0.04 }}>
                <h3>Budget Status</h3>
                <p className="marketing-metric-value">72%</p>
                <div className="marketing-meter-track" aria-hidden>
                  <motion.span
                    className="marketing-meter-fill"
                    initial={{ width: '0%' }}
                    whileInView={{ width: '72%' }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="marketing-metric-detail">$5.8k of $8.0k spent</p>
              </motion.article>

              <motion.article className="marketing-metric-card" whileHover={{ y: -5, scale: 1.01 }} transition={{ duration: 0.2, delay: 0.06 }}>
                <h3>Linked Accounts</h3>
                <p className="marketing-metric-value">21</p>
                <p className="marketing-metric-detail">Checking 5 • Savings 4 • Brokerage 3 • + more</p>
              </motion.article>
            </div>
          </motion.div>
        </motion.section>

        <section className="marketing-guide-wrap max-w-[1460px] mx-auto">
          <motion.h2
            className="marketing-guide-title"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            How to use Jualuma for real financial progress
          </motion.h2>
          <motion.p
            className="marketing-guide-subtitle"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.06 }}
          >
            Follow this workflow to move from scattered records to a repeatable financial decision process.
          </motion.p>

          <div className="marketing-guide-grid">
            {howToSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.article
                  key={step.title}
                  className="marketing-guide-card"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  whileHover={{ y: -8, scale: 1.01 }}
                >
                  <div className="marketing-guide-step-row">
                    <span className="marketing-guide-step-pill">Step {index + 1}</span>
                    <span className="marketing-story-icon marketing-story-icon-connect" aria-hidden>
                      <Icon size={15} strokeWidth={1.95} />
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </motion.article>
              )
            })}
          </div>
        </section>

        <section className="marketing-story-wrap max-w-[1460px] mx-auto">
          <motion.h2
            className="marketing-story-title"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            What individuals get from the platform
          </motion.h2>
          <motion.p
            className="marketing-story-subtitle"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.06 }}
          >
            Every module is designed to simplify decision-making, reduce money drift, and keep your plan operational.
          </motion.p>

          <div className="marketing-story-grid">
            {capabilityCards.map((card, index) => (
              <motion.article
                key={card.title}
                className="marketing-story-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                whileHover={{ y: -8, scale: 1.01 }}
              >
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <motion.section
          className="marketing-infrastructure-wrap max-w-[1460px] mx-auto"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div className="marketing-infrastructure-header">
            <span className="marketing-story-icon marketing-story-icon-ai" aria-hidden><ShieldCheck size={15} strokeWidth={1.95} /></span>
            <h2>Infrastructure and data handling</h2>
          </div>
          <p>
            Jualuma is designed to keep things simple: connect what you want, see what matters, and make decisions with confidence.
          </p>
          <ul>
            {trustPoints.map((point) => {
              const Icon = point.icon
              return (
              <li key={point.text}>
                <span className={`marketing-story-icon ${point.iconClassName}`} aria-hidden><Icon size={15} strokeWidth={1.95} /></span>
                <span>{point.text}</span>
              </li>
              )
            })}
          </ul>
        </motion.section>

        <motion.section
          className="marketing-contact-wrap max-w-[1460px] mx-auto"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2>Need help getting started?</h2>
          <p>Use onboarding support and product guidance channels to configure your setup and move faster.</p>
          <div className="marketing-contact-grid">
            <Link href="/contact" className="marketing-contact-card">
              <span className="marketing-story-icon marketing-story-icon-connect" aria-hidden><Mail size={15} strokeWidth={1.95} /></span>
              <span>Contact Us</span>
            </Link>
            <Link href="/support" className="marketing-contact-card">
              <span className="marketing-story-icon marketing-story-icon-ai" aria-hidden><Users2 size={15} strokeWidth={1.95} /></span>
              <span>Visit support center</span>
            </Link>
          </div>
          <AppAuthLink appPath="/signup" className="btn btn-lg marketing-primary-btn">Create Free Account</AppAuthLink>
        </motion.section>
      </div>
    </div>
  )
}
