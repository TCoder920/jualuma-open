/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { onAuthStateChanged, type User, auth } from '../services/gcp_auth_driver';

export default function ProtectedRoute() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
}
