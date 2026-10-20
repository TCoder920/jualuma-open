/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

type BrandMarkProps = {
  className?: string
  imageClassName?: string
  imageAlt?: string
}

const BRAND_MARK_SRC = '/assets/jualuma-logo-main.png'

export function BrandMark({
  className = '',
  imageClassName = '',
  imageAlt = 'JuaLuma logo',
}: BrandMarkProps) {
  return (
    <div className={`flex items-center justify-center ${className}`.trim()}>
      <img
        src={BRAND_MARK_SRC}
        alt={imageAlt}
        className={`h-20 w-20 object-contain drop-shadow-[0_18px_34px_rgba(59,130,246,0.2)] sm:h-24 sm:w-24 ${imageClassName}`.trim()}
      />
    </div>
  )
}
