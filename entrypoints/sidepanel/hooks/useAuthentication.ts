import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { getEndpoint, OAUTH_POLL_FAIL_COUNT, OAUTH_POLL_MS, OAUTH_POLL_TTL } from '../../Constants.ts';

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface UseAuthentication {
  user: SessionUser | null;
  sessionToken: string | null;
  fcmToken: string | null;
  setUser: Dispatch<SetStateAction<SessionUser | null>>;
  setSessionToken: Dispatch<SetStateAction<string | null>>;
  setFcmToken: Dispatch<SetStateAction<string | null>>;
  logOutSession: () => void;
  startDiscordLogin: () => void;
  dismissAuthError: () => void;
  authError: string | null;
  isLoggingIn: boolean;
}

let storageListener: ((changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void) | null = null;

export function useAuthentication(): UseAuthentication {
  // Stored Local Session States
  const [initializing, setInitializing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Authentication States
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // References
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number | null>(null);
  const oauthTabIdRef = useRef<number | null>(null);

  if (!initialized && !initializing) {
    setInitializing(true);
    console.debug('[useAuthentication] Initializing session state from storage and setting up storage listener.');
    void browser.storage.local.get(['user', 'sessionToken', 'fcmToken']).then((result) => {
      const storedUser = (result as { user?: SessionUser }).user ?? null;
      const storedSessionToken = (result as { sessionToken?: string }).sessionToken ?? null;
      const storedFcmToken = (result as { fcmToken?: string }).fcmToken ?? null;
      setUser(storedUser);
      setSessionToken(storedSessionToken);
      setFcmToken(storedFcmToken);
      setInitialized(true);
      console.debug('[useAuthentication] Session state initialized from storage.');
    });
  }

  // Register Change Listeners
  if (storageListener === null) {
    storageListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>): void => {
      if (!initialized) {
        console.debug('[useAuthentication][storageListener] Storage changed before initial session state was loaded. Ignoring change event.');
        return;
      }
      console.debug('[useAuthentication][storageListener] Storage changed, updating session state.');
      if ('user' in changes) {
        console.debug('[useAuthentication][storageListener] User changed, updating user state.');
        setUser((changes['user']?.newValue as SessionUser) ?? null);
      }
      if ('sessionToken' in changes) {
        console.debug('[useAuthentication][storageListener] Session token changed, updating sessionToken state.');
        setSessionToken((changes['sessionToken']?.newValue as string) ?? null);
      }
      if ('fcmToken' in changes) {
        console.debug('[useAuthentication][storageListener] FCM token changed, updating fcmToken state.');
        setFcmToken((changes['fcmToken']?.newValue as string) ?? null);
      }
    };

    browser.storage.onChanged.addListener(storageListener);
  }

  useEffect(() => {
    if (!initialized) {
      console.debug('[useAuthentication][useEffect] Session state not yet initialized from storage. Skipping persistence for caching.');
      return;
    }
    console.debug('[useAuthentication] Persisting session state to storage.');
    void browser.storage.local.set({ user, sessionToken, fcmToken });
  }, [user, sessionToken, fcmToken, initialized]);

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
      dismissAuthError();
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

  const abortAuthPolling = async (errorMessage?: string): Promise<void> => {
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
      console.error('[useAuthentication][pollSession] Timed out after 120s');
      await abortAuthPolling('Login to Pulsar Timed Out. Please try again.');
      return;
    }

    try {
      const response = await fetch(getEndpoint(`/oauth/session?sessionId=${sessionId}`));

      if (response.status === 202) {
        pollTimeoutRef.current = setTimeout(() => {
          void pollSession(sessionId, failCount);
        }, OAUTH_POLL_MS);
        return;
      }

      if (response.status === 200) {
        const data = (await response.json()) as SessionSuccessResponse;
        setUser(data.user);
        setSessionToken(data.sessionToken);
        await abortAuthPolling();
        return;
      }

      // Parse Error Cause`
      let cause = '';
      try {
        const errorBody = (await response.json()) as SessionErrorResponse;
        cause = errorBody.cause ?? '';
      }
      catch {
        console.debug('[useAuthentication][pollSession] Failed to parse error response body as JSON. Failing to generic response.');
      }

      // 400 SessionIdMissing is immediately fatal (threshold 1)
      const isFatal = response.status === 400 && cause === 'oAuthSession:SessionIdMissing';
      const nextFailCount = isFatal ? OAUTH_POLL_FAIL_COUNT : failCount + 1;

      if (nextFailCount >= OAUTH_POLL_FAIL_COUNT) {
        console.error(`[useAuthentication][pollSession] OAuthSessionIDMissing Response. Polling has been aborted.`);
        await abortAuthPolling('Login to Pulsar Failed. Please try again.');
        return;
      }

      pollTimeoutRef.current = setTimeout(() => {
        void pollSession(sessionId, nextFailCount);
      }, OAUTH_POLL_MS);
    }
    catch (error) {
      const nextFailCount = failCount + 1;
      if (nextFailCount >= OAUTH_POLL_FAIL_COUNT) {
        console.error('[useAuthentication][pollSession] OAuthSessionNetworkError. Polling has been aborted.', error);
        await abortAuthPolling('Login to Pulsar Failed. Please try again.');
        return;
      }
      pollTimeoutRef.current = setTimeout(() => {
        void pollSession(sessionId, nextFailCount);
      }, OAUTH_POLL_MS);
    }
  };

  const startDiscordLogin = (): void => {
    setIsLoggingIn(true);
    void (async () => {
      try {
        const signal = AbortSignal.timeout(5000);
        const response = await fetch(getEndpoint('/oauth/login'), {
          signal,
        });
        if (!response.ok) {
          setAuthError('Login to Pulsar Failed due to API Response. Please try again.');
          throw new Error(`OAuthLoginFailed: Endpoint Returned Failure. Status: ${response.status}`);
        }
        const data = (await response.json()) as LoginResponse;
        const tab = await browser.tabs.create({ url: data.redirect });
        oauthTabIdRef.current = tab.id ?? null;
        pollStartRef.current = Date.now();
        void pollSession(data.sessionId, 0);
      }
      catch (error) {
        console.error('[useAuthentication][handleDiscordLogin] OAuthLoginFailed. Login has been aborted.', error);
        setIsLoggingIn(false);
        showAuthError('Login to Pulsar Failed. Please try again.');
      }
    })();
  };

  return {
    user,
    sessionToken,
    fcmToken,
    setUser,
    setSessionToken,
    setFcmToken,
    logOutSession: () => {
      {
        console.debug('[useAuthentication][logOutSession] Logging out session.');
        setUser(null);
        setSessionToken(null);
        setFcmToken(null);
        browser.storage.local.remove(['user', 'sessionToken', 'fcmToken']);
      }
    },
    isLoggingIn,
    authError,
    startDiscordLogin,
    dismissAuthError,
  };
}

interface LoginResponse {
  sessionId: string;
  redirect: string;
}

interface SessionSuccessResponse {
  user: SessionUser;
  sessionToken: string;
}

interface SessionErrorResponse {
  cause?: string;
}
