/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

// Updated 2025-12-09 17:15 CST by ChatGPT
import type { HTMLAttributes, PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    glass?: boolean
  }
>

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export const Card = ({ children, className, glass = false, ...props }: CardProps) => {
  return (
    <div
      className={cx(glass ? 'glass-panel' : 'card', className)}
      {...props}
    >
      {children}
    </div>
  )
}
