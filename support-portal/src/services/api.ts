/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import axios, { AxiosError } from 'axios';
import { auth } from './gcp_auth_driver';

// Accept both env naming conventions across dev/prod.
const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL;
const baseURL = (envBase && !envBase.includes('backend')) ? envBase : '/api';

export const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle global errors if needed (e.g., specific 401 handling)
        return Promise.reject(error);
    }
);
