import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { SessionUser } from '../../shared/oauth-types.ts';

interface UseSession {
  user: SessionUser | null;
  isLoaded: boolean;
  logout: () => void;
}

export function useSession(): UseSession {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void browser.storage.local.get(['user']).then((result) => {
      const stored = (result as { user?: SessionUser }).user ?? null;
      setUser(stored);
      setIsLoaded(true);
    });

    const handleStorageChange = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    ): void => {
      if ('user' in changes) {
        const next = changes['user']?.newValue ?? null;
        setUser(next !== null ? (next as SessionUser) : null);
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

  return { user, isLoaded, logout };
}
