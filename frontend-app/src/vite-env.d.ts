/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEP_LINK_HOSTS?: string
  readonly VITE_DEEP_LINK_SCHEME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
