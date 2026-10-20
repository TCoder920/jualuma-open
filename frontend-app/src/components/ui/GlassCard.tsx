/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import type { HTMLAttributes, PropsWithChildren } from 'react'

type GlassCardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export const GlassCard = ({ children, className, ...props }: GlassCardProps) => {
  return (
    <div className={cx('glass-card card', className)} {...props}>
      {children}
    </div>
  )
}
