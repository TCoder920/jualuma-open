/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */


import { api } from './api';

export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

export interface Document {
    id: string;
    uid: string;
    name: string;
    type: 'uploaded' | 'generated' | 'stored';
    fileType: string;
    date: string;
    size: string;
    size_bytes: number;
}

export const documentService = {
    getAll: async (): Promise<Document[]> => {
        const response = await api.get('/documents/');
        return response.data;
    },

    upload: async (file: File, type: 'uploaded' | 'generated' | 'stored' = 'uploaded'): Promise<Document> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await api.post('/documents/upload', formData);
        return response.data;
    },

    getDownloadUrl: (id: string) => {
        return `/api/documents/${id}/download`;
    },

    getPreviewUrl: (id: string) => {
        return `/api/documents/${id}/preview`;
    }
};
