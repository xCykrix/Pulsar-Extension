// import { useEffect, useState } from 'react';
// import { browser } from 'wxt/browser';
// import type { SessionUser } from './useDiscordAuth.ts';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { SessionUser } from './useDiscordAuth.ts';

let storageListener: ((changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void) | null = null;

export interface AppUseSession {
  user: SessionUser | null;
  sessionToken: string | null;
  fcmToken: string | null;
  setUser: Dispatch<SetStateAction<SessionUser | null>>;
  setSessionToken: Dispatch<SetStateAction<string | null>>;
  setFcmToken: Dispatch<SetStateAction<string | null>>;
  logOutSession: () => void;
}

export function appUseSession(): AppUseSession {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  if (storageListener === null) {
    void browser.storage.local.get(['user', 'sessionToken', 'fcmToken']).then((result) => {
      const storedUser = (result as { user?: SessionUser }).user ?? null;
      const storedSessionToken = (result as { sessionToken?: string }).sessionToken ?? null;
      const storedFcmToken = (result as { fcmToken?: string }).fcmToken ?? null;
      setUser(storedUser);
      setSessionToken(storedSessionToken);
      setFcmToken(storedFcmToken);
    });

    storageListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>): void => {
      console.debug('[useSession][storageListener] Storage changed, updating session state.');
      if ('user' in changes) {
        setUser((changes['user']?.newValue as SessionUser) ?? null);
      }
      if ('sessionToken' in changes) {
        setSessionToken((changes['sessionToken']?.newValue as string) ?? null);
      }
      if ('fcmToken' in changes) {
        setFcmToken((changes['fcmToken']?.newValue as string) ?? null);
      }
    };

    browser.storage.onChanged.addListener(storageListener);
  }

  return { user, sessionToken, fcmToken, setSessionToken, setUser, setFcmToken, logOutSession };
}

// TODO: Remove this and just use a global state instead?
export function useSession(appUseSession: AppUseSession): AppUseSession {
  useEffect(() => {
    console.debug('[useSession][useEffect] Updating Session State Storage.');
    browser.storage.local.set({ user: appUseSession.user, sessionToken: appUseSession.sessionToken, fcmToken: appUseSession.fcmToken });
  }, [appUseSession.user, appUseSession.sessionToken, appUseSession.fcmToken]);

  return { user: appUseSession.user, sessionToken: appUseSession.sessionToken, fcmToken: appUseSession.fcmToken, setSessionToken: appUseSession.setSessionToken, setUser: appUseSession.setUser, setFcmToken: appUseSession.setFcmToken, logOutSession };
}

function logOutSession(): void {
  console.debug('[useSession][logOutSession] Logging out session.');
  browser.storage.local.remove(['user', 'sessionToken', 'fcmToken']);
}
