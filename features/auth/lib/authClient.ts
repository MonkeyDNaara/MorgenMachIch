"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * The browser's Neon Auth client (#445): talks to our `/api/auth/*` route
 * (#309), throws `AuthApiError` on failed requests and syncs sign-in and
 * sign-out across tabs (BroadcastChannel). One instance for the whole app.
 */
export const authClient = createAuthClient();
