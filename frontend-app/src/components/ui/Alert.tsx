/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Updated 2025-12-09 17:15 CST by ChatGPT
import type { HTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'info' | 'success' | 'warning' | 'danger'

type AlertProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    variant?: Variant
  }
>

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

const variantClass: Record<Variant, string> = {
  info: 'alert alert-info',
  success: 'alert alert-success',
  warning: 'alert alert-warning',
  danger: 'alert alert-danger',
}

export const Alert = ({ children, variant = 'info', className, ...props }: AlertProps) => (
  <div className={cx('break-words', variantClass[variant], className)} {...props}>
    {children}
  </div>
)
