/*
 * Copyright (c) 2026 Intellifide LLC.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See LICENSE and NOTICE.md in the repository root.
 */


import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getMarketingLegalUrl } from '../utils/marketing';

const isNativeRuntime = (): boolean => Capacitor.getPlatform() !== 'web';

export const CookieConsentBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const privacyPolicyUrl = getMarketingLegalUrl('privacy');

    useEffect(() => {
        if (isNativeRuntime()) {
            setIsVisible(false);
            return;
        }
        const consent = localStorage.getItem('jualuma_cookie_consent');
        if (consent === null) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('jualuma_cookie_consent', 'true');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('jualuma_cookie_consent', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
            <div className="container mx-auto max-w-4xl">
                <div className="glass-panel backdrop-blur-xl bg-white/80 border border-white/20 shadow-2xl rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 dark:bg-slate-900/80 dark:border-slate-700/50">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Cookie Preferences
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            We use cookies to enhance your experience and analyze our traffic.
                            By clicking &quot;Accept&quot;, you consent to our use of cookies.
                            Read our <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-royal-purple hover:text-deep-indigo underline">Privacy Policy</a> to learn more.
                        </p>
                    </div>
                    <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:flex-nowrap sm:gap-4">
                        <button
                            onClick={handleDecline}
                            className="flex-1 px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors duration-200 sm:flex-none"
                        >
                            Decline
                        </button>
                        <button
                            onClick={handleAccept}
                            className="flex-1 px-6 py-2.5 rounded-xl text-sm font-medium bg-primary text-white shadow-lg hover:bg-primary-dark hover:-translate-y-0.5 transition-all duration-200 sm:flex-none"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
