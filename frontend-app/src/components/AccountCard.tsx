/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Updated 2025-12-08 21:49 CST by ChatGPT
import { Account } from '../types'

type AccountCardProps = {
  account: Account
  onSync?: (accountId: string) => void
  onEdit?: (accountId: string) => void
  onDelete?: (accountId: string) => void
}

const accountTypeIcon: Record<string, string> = {
  traditional: '🏦',
  investment: '📈',
  web3: '🪙',
  cex: '💱',
  manual: '🗂️',
}

const formatCurrency = (amount?: number | null, currency = 'USD') => {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

export const AccountCard = ({ account, onSync, onEdit, onDelete }: AccountCardProps) => {
  const icon = accountTypeIcon[account.accountType || 'manual'] || '🗂️'
  const isManualSyncSource = account.accountType === 'web3' || account.accountType === 'cex'

  return (
    <div className="backdrop-blur-glass bg-white/70 dark:bg-gray-900/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {icon}
          </span>
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              {account.accountType ?? 'Account'}
            </p>
            <p className="text-lg font-semibold text-slate-900">{account.accountName ?? 'Unnamed account'}</p>
            <p className="text-xs text-slate-500">
              {account.accountNumberMasked ? `•••• ${account.accountNumberMasked}` : '—'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Balance</p>
          <p className="text-xl font-semibold text-deep-indigo">
            {formatCurrency(account.balance ?? undefined, account.currency ?? 'USD')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isManualSyncSource && (
          <button
            type="button"
            onClick={() => onSync?.(account.id)}
            className="px-3 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
          >
            Sync
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit?.(account.id)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(account.id)}
          className="px-3 py-2 text-sm rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
