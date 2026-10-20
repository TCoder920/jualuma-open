/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

export interface PersistedSessionPayload {
  idToken: string
  refreshToken: string
  expiresAt: number
  uid: string
  email: string
}

type SessionStoreMode = 'local' | 'secure' | 'unknown'

interface NativeSessionStorePlugin {
  setSession(options: { payload: string }): Promise<{ mode?: SessionStoreMode }>
  getSession(): Promise<{ payload?: string | null; mode?: SessionStoreMode }>
  clearSession(): Promise<{ mode?: SessionStoreMode }>
}

const NativeSessionStore = registerPlugin<NativeSessionStorePlugin>('NativeSessionStore')

const isNativeRuntime = (): boolean => Capacitor.getPlatform() !== 'web'
const isNativeSessionStoreAvailable = (): boolean =>
  isNativeRuntime() && Capacitor.isPluginAvailable('NativeSessionStore')

const parsePayload = (rawPayload: string): PersistedSessionPayload | null => {
  try {
    const parsed = JSON.parse(rawPayload) as Partial<PersistedSessionPayload>
    if (!parsed.idToken || !parsed.refreshToken || !parsed.uid || typeof parsed.expiresAt !== 'number') {
      return null
    }
    return {
      idToken: parsed.idToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      uid: parsed.uid,
      email: parsed.email ?? '',
    }
  } catch {
    return null
  }
}

export const saveNativeSession = async (payload: PersistedSessionPayload): Promise<void> => {
  if (!isNativeSessionStoreAvailable()) return
  try {
    await NativeSessionStore.setSession({ payload: JSON.stringify(payload) })
  } catch (error) {
    console.error('Failed to persist session in native secure store', error)
  }
}

export const loadNativeSession = async (): Promise<PersistedSessionPayload | null> => {
  if (!isNativeSessionStoreAvailable()) return null
  try {
    const response = await NativeSessionStore.getSession()
    if (!response.payload) return null
    return parsePayload(response.payload)
  } catch (error) {
    console.error('Failed to load native secure session', error)
    return null
  }
}

export const clearNativeSession = async (): Promise<void> => {
  if (!isNativeSessionStoreAvailable()) return
  try {
    await NativeSessionStore.clearSession()
  } catch (error) {
    console.error('Failed to clear native secure session', error)
  }
}
