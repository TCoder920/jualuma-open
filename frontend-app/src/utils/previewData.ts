/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Core Purpose: Synthetic preview datasets for premium UI parity in local dev.
// Last Updated: 2026-01-27

export type PreviewStat = {
  label: string
  value: string
  change?: string
  changeTone?: 'positive' | 'neutral' | 'negative'
}

export const previewDashboard = {
  stats: [
    { label: 'Net Worth', value: '$142,580', change: '+4.2%', changeTone: 'positive' },
    { label: 'Cash Flow', value: '$3,420', change: '+$860', changeTone: 'positive' },
    { label: 'Budget Use', value: '68%', change: 'On track', changeTone: 'neutral' },
  ] satisfies PreviewStat[],
  sparkline: [12, 18, 14, 22, 28, 26, 32, 30, 35, 38, 42],
  accounts: [
    { name: 'Chase Checking', value: '$4,280' },
    { name: 'Vanguard IRA', value: '$32,900' },
    { name: 'Apple Card', value: '$1,240' },
  ],
}

export const previewCategorization = {
  transactions: [
    { icon: '🍕', name: 'Luna Pizza', amount: '-$32.40', category: 'Dining', highlight: true },
    { icon: '⛽', name: 'Sunset Fuel', amount: '-$54.10', category: 'Transportation' },
    { icon: '🛒', name: 'North Grocer', amount: '-$121.05', category: 'Groceries' },
  ],
  suggestion: 'Auto-suggest: Move Luna Pizza → Dining',
}

export const previewBudgets = {
  items: [
    { name: 'Groceries', spent: '$520', limit: '$600', progress: 86, tone: 'warning' },
    { name: 'Dining', spent: '$240', limit: '$350', progress: 68, tone: 'accent' },
    { name: 'Utilities', spent: '$110', limit: '$150', progress: 73, tone: 'normal' },
  ],
  alert: '2 categories nearing limits',
}

export const previewHealth = {
  score: 78,
  stats: [
    { icon: '📈', label: 'Cash buffer', value: '+12%', positive: true },
    { icon: '🧾', label: 'Bills covered', value: '5 / 6', positive: true },
    { icon: '⚠️', label: 'Debt ratio', value: '28%', positive: false },
  ],
}

export const previewAssets = {
  items: [
    { icon: '🏠', name: 'Primary Home', date: 'Purchased 2021', value: '$520k' },
    { icon: '🚗', name: 'Model 3', date: 'Purchased 2023', value: '$32k' },
    { icon: '🎨', name: 'Art Collection', date: 'Updated Q3', value: '$18k' },
  ],
  total: '$570k total assets',
}
