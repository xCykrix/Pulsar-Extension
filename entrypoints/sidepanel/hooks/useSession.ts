import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { SessionUser } from './useDiscordAuth.ts';

interface UseSession {
  user: SessionUser | null;
  sessionToken: string | null;
  isLoaded: boolean;
  logout: () => void;
}

export function useSession(): UseSession {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void browser.storage.local.get(['user', 'sessionToken']).then((result) => {
      const stored = (result as { user?: SessionUser }).user ?? null;
      const token = (result as { sessionToken?: string }).sessionToken ?? null;
      setUser(stored);
      setSessionToken(token);
      setIsLoaded(true);
    });

    const handleStorageChange = (
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
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const logout = (): void => {
    void browser.storage.local.remove(['user', 'sessionToken']);
  };

  return { user, sessionToken, isLoaded, logout };
}
