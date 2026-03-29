// import { useEffect, useState } from 'react';
// import { browser } from 'wxt/browser';
// import type { SessionUser } from './useDiscordAuth.ts';

import { type Dispatch, type SetStateAction, useState } from 'react';
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
    console.debug('[useSession] Initializing session state from storage and setting up storage listener.');
    void browser.storage.local.get(['user', 'sessionToken', 'fcmToken']).then((result) => {
      const storedUser = (result as { user?: SessionUser }).user ?? null;
      const storedSessionToken = (result as { sessionToken?: string }).sessionToken ?? null;
      const storedFcmToken = (result as { fcmToken?: string }).fcmToken ?? null;
      setUser(storedUser);
      setSessionToken(storedSessionToken);
      setFcmToken(storedFcmToken);
      console.debug('[useSession] Session state initialized from storage.');
    });

    storageListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>): void => {
      console.debug('[useSession][storageListener] Storage changed, updating session state.');
      if ('user' in changes) {
        console.debug('[useSession][storageListener] User changed, updating user state.');
        setUser((changes['user']?.newValue as SessionUser) ?? null);
      }
      if ('sessionToken' in changes) {
        console.debug('[useSession][storageListener] Session token changed, updating sessionToken state.');
        setSessionToken((changes['sessionToken']?.newValue as string) ?? null);
      }
      if ('fcmToken' in changes) {
        console.debug('[useSession][storageListener] FCM token changed, updating fcmToken state.');
        setFcmToken((changes['fcmToken']?.newValue as string) ?? null);
      }
    };

    browser.storage.onChanged.addListener(storageListener);
  }

  return { user, sessionToken, fcmToken, setSessionToken, setUser, setFcmToken, logOutSession };
}

function logOutSession(): void {
  console.debug('[useSession][logOutSession] Logging out session.');
  browser.storage.local.remove(['user', 'sessionToken', 'fcmToken']);
}
