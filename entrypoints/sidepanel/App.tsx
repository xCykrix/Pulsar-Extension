/** @jsxImportSource react */

import { type ReactElement, type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';

import { browser } from 'wxt/browser';

const API_BASE = 'http://localhost:9000';
const DISCORD_LOGIN_BREAKPOINTS = {
  full: 430,
  compact: 340,
} as const;
const TOAST_TIMEOUT_MS = 4200;

type LoginButtonMode = 'full' | 'compact' | 'hidden';
type ToastType = 'info' | 'error';

interface DiscordUser {
  id: string;
  username: string;
  avatar?: string | null;
}

interface StoredSession {
  discordUser?: DiscordUser;
  sessionToken?: string;
}

interface AuthStartResponse {
  sessionId?: string;
  authUrl?: string;
}

interface AuthStatusResponse {
  status?: 'pending' | 'complete' | 'error';
  user?: DiscordUser;
  sessionToken?: string;
  error?: string;
}

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const DEFAULT_TOAST: ToastState = {
  message: '',
  type: 'info',
  visible: false,
};

export function App(): ReactElement {
  const topAppBarRef = useRef<HTMLElement | null>(null);
  const logoutMenuRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLogoutMenuOpen, setIsLogoutMenuOpen] = useState(false);
  const [loginButtonMode, setLoginButtonMode] = useState<LoginButtonMode>('full');
  const [toast, setToast] = useState<ToastState>(DEFAULT_TOAST);

  useEffect(() => {
    void syncStoredUser();

    const handleStorageChange = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !Object.hasOwn(changes, 'discordUser')) {
        return;
      }

      const nextUser = changes.discordUser?.newValue as DiscordUser | undefined;
      setUser(nextUser ?? null);
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const topAppBar = topAppBarRef.current;
    if (!topAppBar) {
      return undefined;
    }

    const updateLoginButtonMode = (): void => {
      const availableWidth = topAppBar.clientWidth;

      if (availableWidth >= DISCORD_LOGIN_BREAKPOINTS.full) {
        setLoginButtonMode('full');
        return;
      }

      if (availableWidth >= DISCORD_LOGIN_BREAKPOINTS.compact) {
        setLoginButtonMode('compact');
        return;
      }

      setLoginButtonMode('hidden');
    };

    updateLoginButtonMode();

    const observer = new globalThis.ResizeObserver(() => {
      updateLoginButtonMode();
    });
    observer.observe(topAppBar);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent): void => {
      if (!logoutMenuRef.current) {
        setIsLogoutMenuOpen(false);
        return;
      }

      if (!logoutMenuRef.current.contains(event.target as Node)) {
        setIsLogoutMenuOpen(false);
      }
    };

    globalThis.document.addEventListener('click', handleDocumentClick);

    return () => {
      globalThis.document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        globalThis.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleDiscordLogin = async (): Promise<void> => {
    setIsLoggingIn(true);

    try {
      const loggedInUser = await initiateDiscordLogin();
      setUser(loggedInUser);
    } catch (error) {
      showToast(getLoginErrorMessage(error), 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    await browser.storage.local.remove(['discordUser', 'sessionToken']);
    setIsLogoutMenuOpen(false);
    setUser(null);
  };

  const toggleLogoutMenu = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    setIsLogoutMenuOpen((currentValue: boolean) => !currentValue);
  };

  const showToast = (message: string, type: ToastType = 'info'): void => {
    setToast({ message, type, visible: true });

    if (toastTimerRef.current !== null) {
      globalThis.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = globalThis.setTimeout(() => {
      setToast((currentToast: ToastState) => ({ ...currentToast, visible: false }));
    }, TOAST_TIMEOUT_MS);
  };

  const avatarUrl = user?.avatar ? getDiscordAvatarUrl(user) : null;

  return (
    <div className="container">
      <header className="top-app-bar" ref={topAppBarRef}>
        <div className="top-app-bar-start">
          <span className="material-icons" aria-hidden="true">featured_play_list</span>
          <div className="title-group">
            <h1>Pulsar</h1>
            <p className="title-subtitle">Notification Assistant</p>
          </div>
        </div>
        <div className="auth-section">
          {!user && loginButtonMode !== 'hidden' ? (
            <button
              type="button"
              className="btn-filled discord-login-btn"
              aria-label="Login with Discord"
              onClick={() => {
                void handleDiscordLogin();
              }}
              disabled={isLoggingIn}
              data-label-mode={loginButtonMode}
            >
              <DiscordIcon className="discord-login-icon" />
              {loginButtonMode === 'full' && <span className="discord-login-label">Login with Discord</span>}
            </button>
          ) : null}
          {user ? (
            <div className="user-menu" ref={logoutMenuRef}>
              <button
                type="button"
                className="user-avatar"
                aria-label={`${user.username} account menu`}
                onClick={toggleLogoutMenu}
              >
                {avatarUrl ? <img src={avatarUrl} alt={`${user.username}'s avatar`} /> : <span>{user.username.slice(0, 1).toUpperCase()}</span>}
              </button>
              <div className={`logout-menu${isLogoutMenuOpen ? ' show' : ''}`}>
                <button type="button" className="logout-menu-item" onClick={() => {
                  void handleLogout();
                }}>
                  <span className="material-icons" aria-hidden="true">logout</span>
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>
      <main className="content">
        <section className="card card-centered">
          <p>Hello world</p>
        </section>
      </main>
      <div
        className={`toast toast-${toast.type}${toast.visible ? ' show' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>
    </div>
  );

  async function syncStoredUser(): Promise<void> {
    const data = (await browser.storage.local.get(['discordUser'])) as StoredSession;
    setUser(data.discordUser ?? null);
  }

  async function initiateDiscordLogin(): Promise<DiscordUser> {
    const startResponse = await fetchWithTimeout(`${API_BASE}/auth/discord/start`, {}, 8000);
    if (!startResponse.ok) {
      throw new Error('Discord login service is unavailable. Please try again.');
    }

    const startData = (await startResponse.json()) as AuthStartResponse;
    const { sessionId, authUrl } = startData;

    if (!sessionId || !authUrl) {
      throw new Error('Discord login service returned an invalid response.');
    }

    await browser.tabs.create({ url: authUrl });

    return await new Promise<DiscordUser>((resolve, reject) => {
      const startedAt = Date.now();
      const maxPollMs = 120000;

      const poll = globalThis.setInterval(async () => {
        try {
          if (Date.now() - startedAt > maxPollMs) {
            globalThis.clearInterval(poll);
            reject(new Error('Pulsar Login timed out. Please try again.'));
            return;
          }

          const statusResponse = await fetchWithTimeout(
            `${API_BASE}/auth/discord/status?sessionId=${encodeURIComponent(sessionId)}`,
            {},
            8000,
          );

          if (!statusResponse.ok && statusResponse.status !== 404) {
            throw new Error('Unable to reach the Pulsar Login Service. Please try again later or report an issue.');
          }

          const data = (await statusResponse.json()) as AuthStatusResponse;
          if (!data.status) {
            globalThis.clearInterval(poll);
            reject(new Error('Pulsar Login Status was invalid. Please report an issue.'));
            return;
          }

          if (data.status === 'complete') {
            if (!data.user || !data.sessionToken) {
              globalThis.clearInterval(poll);
              reject(new Error('Pulsar Login successful but session data was invalid. Please report an issue.'));
              return;
            }

            globalThis.clearInterval(poll);
            await browser.storage.local.set({ discordUser: data.user, sessionToken: data.sessionToken });
            resolve(data.user);
            return;
          }

          if (data.status === 'error') {
            globalThis.clearInterval(poll);
            reject(new Error(data.error || 'Login Failed. Please try again.'));
          }
        } catch (error) {
          globalThis.clearInterval(poll);
          reject(error);
        }
      }, 1500);
    });
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Discord login request timed out.');
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return 'Unable to reach the Pulsar Login Service. Please try again later or report an issue. [2]';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Login Failed. Please try again.';
}

function getDiscordAvatarUrl(user: DiscordUser): string {
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

function DiscordIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.294.075.075 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.075.075 0 0 1 .079.009c.12.098.246.198.373.294a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.699.77 1.364 1.225 1.994a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.057c.5-4.761-.838-8.898-3.557-12.56a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156 0-1.193.964-2.157 2.157-2.157 1.193 0 2.157.964 2.157 2.157 0 1.191-.964 2.156-2.157 2.156zm7.975 0c-1.183 0-2.157-.965-2.157-2.156 0-1.193.964-2.157 2.157-2.157 1.193 0 2.157.964 2.157 2.157 0 1.191-.964 2.156-2.157 2.156z" />
    </svg>
  );
}
