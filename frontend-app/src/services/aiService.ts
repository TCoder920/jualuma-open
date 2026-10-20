/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import { api } from './api';
import { getIdToken } from './auth';
import { normalizeApiError } from './apiErrorMessages';
import type { PageContext } from '../hooks/usePageContext';
import type { ConversationTurn, ThreadSummary } from '../utils/aiThreads';

export interface AIResponse {
    response: string;
    tokens: number;
    quota_remaining?: number;
    quota_limit?: number;
    quota_used?: number;
    effective_model?: string;
    fallback_applied?: boolean;
    fallback_reason?: string | null;
    fallback_message?: string | null;
    web_search_used?: boolean;
    citations?: Array<{ title: string; url: string }>;
    error_code?: string | null;
}

export interface HistoryItem {
    prompt: string;
    response: string;
    timestamp: string;
}

export interface HistoryResponse {
    messages: HistoryItem[];
}

export interface QuotaStatus {
    used: number;
    limit: number;
    usage_progress?: number;
    usage_copy?: string;
    resets_at: string;
    tier: string;
}

type StreamHandlers = {
    onChunk: (delta: string) => void;
    onComplete?: (response: AIResponse) => void;
    onWebSearchStatus?: (status: 'started' | 'completed', resultsCount?: number) => void;
    signal?: AbortSignal;
    chunkDebounceMs?: number;
};

type SendMessageOptions = {
    clientContext?: PageContext;
    attachmentIds?: string[];
    conversationHistory?: ConversationTurn[];
    threadSummaries?: ThreadSummary[];
};

const normalizeSendMessageOptions = (
    input?: PageContext | SendMessageOptions,
    attachmentIds?: string[],
): SendMessageOptions => {
    if (!input) {
        return attachmentIds ? { attachmentIds } : {};
    }

    if ('route' in input || 'query' in input || 'pageTitle' in input) {
        return {
            clientContext: input as PageContext,
            attachmentIds,
        };
    }

    return input;
};

const envBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  import.meta.env.VITE_API_TARGET;
const baseURL = (envBase && !envBase.includes('backend')) ? envBase : '/api';

const extractResponseError = async (response: Response): Promise<unknown> => {
    const maybeJson = await response
        .clone()
        .json()
        .catch(() => null as { detail?: unknown; message?: unknown; error?: unknown; code?: unknown } | null);
    if (maybeJson) {
        return maybeJson;
    }

    const text = await response.text().catch(() => '');
    return text || `Request failed with status code ${response.status}`;
};

export const aiService = {
    sendMessage: async (
        message: string,
        clientContextOrOptions?: PageContext | SendMessageOptions,
        attachmentIds?: string[],
    ): Promise<AIResponse> => {
        const options = normalizeSendMessageOptions(clientContextOrOptions, attachmentIds);
        const response = await api.post<AIResponse>(
            '/ai/chat',
            {
                message,
                client_context: options.clientContext,
                attachment_ids: options.attachmentIds,
                conversation_history: options.conversationHistory,
                thread_summaries: options.threadSummaries,
            },
            { timeout: 30000 }
        );
        return response.data;
    },

    sendMessageStream: async (
        message: string,
        handlers: StreamHandlers,
        clientContextOrOptions?: PageContext | SendMessageOptions,
        attachmentIds?: string[],
    ): Promise<AIResponse> => {
        const options = normalizeSendMessageOptions(clientContextOrOptions, attachmentIds);
        const token = await getIdToken();
        const flushMs = Math.max(0, handlers.chunkDebounceMs ?? 60);
        const response = await fetch(`${baseURL}/ai/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                message,
                client_context: options.clientContext,
                attachment_ids: options.attachmentIds,
                conversation_history: options.conversationHistory,
                thread_summaries: options.threadSummaries,
            }),
            signal: handlers.signal,
        });

        if (!response.ok) {
            const rawMessage = await extractResponseError(response);
            const normalized = normalizeApiError(response.status, rawMessage);
            const error = new Error(normalized.message) as Error & { code?: string };
            error.code = normalized.code;
            throw error;
        }
        if (!response.body) {
            throw new Error('The AI response stream is temporarily unavailable. Please try again.');
        }

        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        let buffer = '';
        let fullText = '';
        let finalPayload: AIResponse | null = null;
        let pendingDelta = '';
        let lastFlush = Date.now();

        const flushPending = () => {
            if (!pendingDelta) return;
            handlers.onChunk(pendingDelta);
            pendingDelta = '';
            lastFlush = Date.now();
        };

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';

            for (const evt of events) {
                const dataLine = evt
                    .split('\n')
                    .find((line) => line.startsWith('data:'));
                if (!dataLine) continue;

                const raw = dataLine.slice(5).trim();
                if (!raw) continue;

                const parsed = JSON.parse(raw) as {
                    type?: string;
                    delta?: string;
                    error?: string;
                    response?: string;
                    tokens?: number;
                    quota_remaining?: number;
                    quota_limit?: number;
                    quota_used?: number;
                    effective_model?: string;
                    fallback_applied?: boolean;
                    fallback_reason?: string | null;
                    fallback_message?: string | null;
                    web_search_used?: boolean;
                    citations?: Array<{ title: string; url: string }>;
                    code?: string;
                    error_code?: string;
                    status?: 'started' | 'completed';
                    results_count?: number;
                };

                if (parsed.type === 'chunk' && parsed.delta) {
                    fullText += parsed.delta;
                    pendingDelta += parsed.delta;
                    if (flushMs === 0 || Date.now() - lastFlush >= flushMs) {
                        flushPending();
                    }
                    continue;
                }

                if (parsed.type === 'error') {
                    const normalized = normalizeApiError(undefined, {
                        message: parsed.error || 'Streaming failed.',
                        code: parsed.code,
                    });
                    const error = new Error(normalized.message) as Error & { code?: string };
                    error.code = normalized.code;
                    throw error;
                }

                if (parsed.type === 'web_search') {
                    handlers.onWebSearchStatus?.(parsed.status ?? 'completed', parsed.results_count ?? 0);
                    continue;
                }

                if (parsed.type === 'complete') {
                    finalPayload = {
                        response: parsed.response ?? fullText,
                        tokens: parsed.tokens ?? 0,
                        quota_remaining: parsed.quota_remaining,
                        quota_limit: parsed.quota_limit,
                        quota_used: parsed.quota_used,
                        effective_model: parsed.effective_model,
                        fallback_applied: parsed.fallback_applied,
                        fallback_reason: parsed.fallback_reason,
                        fallback_message: parsed.fallback_message,
                        web_search_used: parsed.web_search_used,
                        citations: parsed.citations ?? [],
                        error_code: parsed.error_code ?? parsed.code,
                    };
                }
            }
        }

        flushPending();

        const result = finalPayload ?? { response: fullText, tokens: 0 };
        handlers.onComplete?.(result);
        return result;
    },

    getHistory: async (): Promise<HistoryItem[]> => {
        try {
            const response = await api.get<HistoryResponse>('/ai/history');
            return response.data.messages;
        } catch (error) {
            console.error("Failed to fetch history:", error);
            return [];
        }
    },

    getQuota: async (): Promise<QuotaStatus | null> => {
        try {
            const response = await api.get<QuotaStatus>('/ai/quota');
            return response.data;
        } catch (error) {
            return null;
        }
    }
};
