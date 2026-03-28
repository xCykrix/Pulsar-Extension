import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { SessionUser } from './useDiscordAuth.ts';

interface UseSession {
  user: SessionUser | null;
  sessionToken: string | null;
  fcmToken: string | null;

  isLoaded: boolean;
  logout: () => void;
}

export function useSession(): UseSession {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void browser.storage.local.get(['user', 'sessionToken', 'fcmToken']).then((result) => {
      const stored = (result as { user?: SessionUser }).user ?? null;
      const token = (result as { sessionToken?: string }).sessionToken ?? null;
      const fcmToken = (result as { fcmToken?: string }).fcmToken ?? null;
      setUser(stored);
      setSessionToken(token);
      setFcmToken(fcmToken);
      setIsLoaded(true);
    });

    const change = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    ): void => {
      if ('user' in changes) {
        const next = changes['user']?.newValue ?? null;
        setUser(next !== null ? (next as SessionUser) : null);
      }
      if ('sessionToken' in changes) {
        const nextToken = changes['sessionToken']?.newValue ?? null;
        setSessionToken(nextToken !== null ? (nextToken as string) : null);
      }
      if ('fcmToken' in changes) {
        const nextFcmToken = changes['fcmToken']?.newValue ?? null;
        setFcmToken(nextFcmToken !== null ? (nextFcmToken as string) : null);
      }
    };

    browser.storage.onChanged.addListener(change);
    return () => {
      browser.storage.onChanged.removeListener(change);
    };
  }, []);

  const logout = (): void => {
    void browser.storage.local.remove(['user', 'sessionToken', 'fcmToken']);
  };

  return { user, sessionToken, fcmToken, isLoaded, logout };
}
