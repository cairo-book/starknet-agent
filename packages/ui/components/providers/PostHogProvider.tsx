'use client';

import { PostHogProvider as OriginalPostHogProvider } from 'posthog-js/react';

export default function PostHogProviderClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!posthogKey || !posthogHost) {
        console.log('PostHog credentials missing, rendering without PostHog');
        return <>{children}</>;
    }

    return (
        <OriginalPostHogProvider
            apiKey={posthogKey}
            options={{
                api_host: posthogHost,
                session_recording: {
                    recordCrossOriginIframes: true,
                },
                capture_pageleave: false,
            }}
        >
            {children}
        </OriginalPostHogProvider>
    );
} 