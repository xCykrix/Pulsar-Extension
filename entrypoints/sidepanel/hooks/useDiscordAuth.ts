import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { getEndpoint, OAUTH_POLL_FAIL_COUNT, OAUTH_POLL_MS, OAUTH_POLL_TTL } from '../../shared/const.ts';

interface UseDiscordAuth {
  isLoggingIn: boolean;
  authError: string | null;
  handleDiscordLogin: () => void;
  dismissAuthError: () => void;
}

export function useDiscordAuth(): UseDiscordAuth {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number | null>(null);
  const oauthTabIdRef = useRef<number | null>(null);
  const errorDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current !== null) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      if (errorDismissRef.current !== null) {
        clearTimeout(errorDismissRef.current);
        errorDismissRef.current = null;
      }
    };
  }, []);

  const showAuthError = (message: string): void => {
    setAuthError(message);
    if (errorDismissRef.current !== null) {
      clearTimeout(errorDismissRef.current);
    }
    errorDismissRef.current = setTimeout(() => {
      setAuthError(null);
      errorDismissRef.current = null;
    }, 5000);
  };

  const dismissAuthError = (): void => {
    setAuthError(null);
    if (errorDismissRef.current !== null) {
      clearTimeout(errorDismissRef.current);
      errorDismissRef.current = null;
    }
  };

  const stopPolling = async (errorMessage?: string): Promise<void> => {
    if (pollTimeoutRef.current !== null) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (oauthTabIdRef.current !== null) {
      try {
        await browser.tabs.remove(oauthTabIdRef.current);
      }
      catch {
        // tab may already be closed
      }
      oauthTabIdRef.current = null;
    }
    pollStartRef.current = null;
    setIsLoggingIn(false);
    if (errorMessage !== undefined) {
      showAuthError(errorMessage);
    }
  };

  const pollSession = async (sessionId: string, failCount: number): Promise<void> => {
    if (
      pollStartRef.current !== null
      && Date.now() - pollStartRef.current >= OAUTH_POLL_TTL
    ) {
      console.error('[Pulsar] Session polling timed out after 120s');
      await stopPolling('Authentication timed out. Please try again.');
      return;
    }

    try {
      const response = await fetch(getEndpoint(`/oauth/session?sessionId=${encodeURIComponent(sessionId)}`));

      if (response.status === 202) {
        pollTimeoutRef.current = setTimeout(() => {
          void pollSession(sessionId, failCount);
        }, OAUTH_POLL_MS);
        return;
      }

      if (response.status === 200) {
        const data = (await response.json()) as SessionSuccessResponse;
        await browser.storage.local.set({ user: data.user, sessionToken: data.sessionToken });
        await stopPolling();
        return;
      }

      // Parse Error Cause
      let cause = '';
      try {
        const errorBody = (await response.json()) as SessionErrorResponse;
        cause = errorBody.cause ?? '';
      }
      catch {
        // ignore JSON parse failure
      }

      // 400 SessionIdMissing is immediately fatal (threshold 1)
      const isFatal = response.status === 400 && cause === 'oAuthSession:SessionIdMissing';
      const nextFailCount = isFatal ? OAUTH_POLL_FAIL_COUNT : failCount + 1;

      if (nextFailCount >= OAUTH_POLL_FAIL_COUNT) {
        console.error(`[Pulsar] Session polling stopped: HTTP ${response.status} cause="${cause}"`);
        await stopPolling('Authentication failed. Please try again.');
        return;
      }

      pollTimeoutRef.current = setTimeout(() => {
        void pollSession(sessionId, nextFailCount);
      }, OAUTH_POLL_MS);
    }
    catch (error) {
      const nextFailCount = failCount + 1;
      if (nextFailCount >= OAUTH_POLL_FAIL_COUNT) {
        console.error('[Pulsar] Session polling network error:', error);
        await stopPolling('Authentication failed. Please try again.');
        return;
      }
      pollTimeoutRef.current = setTimeout(() => {
        void pollSession(sessionId, nextFailCount);
      }, OAUTH_POLL_MS);
    }
  };

  const handleDiscordLogin = (): void => {
    setIsLoggingIn(true);
    void (async () => {
      try {
        const response = await fetch(getEndpoint('/oauth/login'));
        if (!response.ok) {
          throw new Error(`Login request failed with status ${response.status}`);
        }
        const data = (await response.json()) as LoginResponse;
        const tab = await browser.tabs.create({ url: data.redirect });
        oauthTabIdRef.current = tab.id ?? null;
        pollStartRef.current = Date.now();
        void pollSession(data.sessionId, 0);
      }
      catch (error) {
        console.error('[Pulsar] Discord login failed:', error);
        setIsLoggingIn(false);
        showAuthError('Could not reach authentication service. Please try again.');
      }
    })();
  };

  return { isLoggingIn, authError, handleDiscordLogin, dismissAuthError };
}

export interface LoginResponse {
  sessionId: string;
  redirect: string;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface SessionSuccessResponse {
  user: SessionUser;
  sessionToken: string;
}

export interface SessionErrorResponse {
  cause?: string;
}
