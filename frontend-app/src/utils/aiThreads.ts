/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

export interface Message {
  role: 'user' | 'assistant'
  text: string
  time: string
  pending?: boolean
  citations?: Array<{ title: string; url: string }>
  webSearchUsed?: boolean
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  text: string
  timestamp?: string
}

export interface ThreadSummary {
  title: string
  preview: string
  timestamp?: string
}

export const AI_STORAGE_UPDATED_EVENT = 'jualuma:ai-storage-updated'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'for', 'of', 'on', 'in', 'at', 'by', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'can', 'could',
  'should', 'would', 'may', 'might', 'will', 'just', 'please', 'show', 'tell', 'give',
  'my', 'your', 'our', 'their', 'me', 'us', 'you', 'i', 'we', 'they', 'this', 'that',
  'these', 'those', 'about', 'from', 'into', 'over', 'under', 'what', 'whats', 'how',
  'when', 'where', 'why', 'who', 's',
])

export interface Thread {
  id: string
  title: string
  timestamp: string
  preview: string
  messages: Message[]
  projectId?: string | null
}

export const getAIStorageKeys = (uid?: string | null) => {
  const keySuffix = uid || 'anon'
  return {
    storageKey: `jualuma_ai_thread_${keySuffix}`,
    threadStorageKey: `jualuma_ai_current_thread_${keySuffix}`,
    threadsStorageKey: `jualuma_ai_threads_${keySuffix}`,
  }
}

export const notifyAIStorageUpdated = (threadId: string) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AI_STORAGE_UPDATED_EVENT, { detail: { threadId } }))
}

export const generateThreadTitle = (query: string) => {
  const trimmed = query.trim()
  if (!trimmed) return 'New Chat'
  const normalized = trimmed.toLowerCase()
  const patterns: Array<[RegExp, string]> = [
    [/net worth/, 'Net Worth Snapshot'],
    [/cash flow/, 'Cash Flow Update'],
    [/subscription/, 'Subscription Review'],
    [/budget/, 'Budget Check'],
    [/spend|spending/, 'Spending Summary'],
    [/category|categories/, 'Category Breakdown'],
    [/income/, 'Income Overview'],
    [/investment/, 'Investment Overview'],
    [/debt|loan/, 'Debt Overview'],
  ]

  for (const [pattern, title] of patterns) {
    if (pattern.test(normalized)) {
      return title.toLowerCase() === normalized ? `${title} Overview` : title
    }
  }

  const tokens = normalized.match(/[a-z0-9]+/g) ?? []
  const keywords = tokens.filter((token) => !STOP_WORDS.has(token))
  const unique = Array.from(new Set(keywords)).slice(0, 4)
  if (unique.length === 0) return 'New Chat'
  const base = unique.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  const title = `${base} Overview`
  return title.toLowerCase() === normalized ? `${base} Insights` : title
}

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const getStoredThreads = (threadsStorageKey: string) => {
  if (typeof window === 'undefined') return [] as Thread[]
  return safeParse<Thread[]>(localStorage.getItem(threadsStorageKey), [])
}

export const getStoredMessages = (storageKey: string, threadId: string) => {
  if (typeof window === 'undefined') return [] as Message[]
  return safeParse<Message[]>(localStorage.getItem(`${storageKey}_${threadId}`), [])
}

const normalizeSnippet = (value: string, maxLength: number) => {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (!collapsed) return ''
  return collapsed.length > maxLength
    ? `${collapsed.slice(0, maxLength - 1).trimEnd()}…`
    : collapsed
}

const tokenize = (value: string) =>
  Array.from(
    new Set(
      (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
        (token) => token.length >= 3 && !STOP_WORDS.has(token),
      ),
    ),
  )

const overlapScore = (referenceTokens: string[], candidateText: string) => {
  if (referenceTokens.length === 0) return 0
  const candidateTokens = new Set(tokenize(candidateText))
  return referenceTokens.reduce(
    (score, token) => score + (candidateTokens.has(token) ? 1 : 0),
    0,
  )
}

export const buildConversationHistory = (
  messages: Message[],
  limit = 8,
): ConversationTurn[] =>
  messages
    .filter((message) => !message.pending && Boolean(message.text?.trim()))
    .slice(-limit)
    .map((message) => ({
      role: message.role,
      text: normalizeSnippet(message.text, 1200),
      timestamp: message.time,
    }))
    .filter((message) => Boolean(message.text))

export const buildThreadSummaries = (
  threads: Thread[],
  currentThreadId: string | null,
  currentPrompt: string,
  maxItems = 4,
): ThreadSummary[] => {
  const promptTokens = tokenize(currentPrompt)

  return threads
    .filter((thread) => thread.id !== currentThreadId)
    .map((thread) => {
      const sourcePreview =
        thread.preview ||
        thread.messages
          .slice(-2)
          .map((message) => message.text)
          .join(' ')
      const preview = normalizeSnippet(sourcePreview, 220)
      const title = normalizeSnippet(thread.title || 'Prior chat', 80)
      const relevanceBase = overlapScore(promptTokens, `${title} ${preview}`)
      const recencyBoost = thread.timestamp ? Date.parse(thread.timestamp) || 0 : 0
      return {
        summary: {
          title,
          preview,
          timestamp: thread.timestamp,
        },
        relevanceBase,
        recencyBoost,
      }
    })
    .filter((entry) => entry.summary.title || entry.summary.preview)
    .sort((left, right) => {
      if (right.relevanceBase !== left.relevanceBase) {
        return right.relevanceBase - left.relevanceBase
      }
      return right.recencyBoost - left.recencyBoost
    })
    .slice(0, maxItems)
    .map((entry) => entry.summary)
}
