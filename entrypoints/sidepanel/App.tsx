/** @jsxImportSource react */

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { browser } from 'wxt/browser';
import { getRemoteConfigValue } from '../shared/firebase-config.ts';
import { useDiscordAuth } from './hooks/useDiscordAuth.ts';
import { useFirebaseTokenRegistration } from './hooks/useFirebaseTokenRegistration.ts';
import { useSession } from './hooks/useSession.ts';

interface SidepanelFcmMessage {
  type: 'PULSAR/FCM_SIDEPANEL_MESSAGE';
  notification: {
    title?: string;
    body?: string;
  };
  sentAtMs?: number;
  receivedAtMs?: number;
}

export function App(): ReactElement {
  const { isLoggingIn, authError, handleDiscordLogin, dismissAuthError } = useDiscordAuth();
  const { user, sessionToken, logout } = useSession();
  const [fcmToast, setFcmToast] = useState<{ title: string; body: string } | null>(null);
  const [lastDataAt, setLastDataAt] = useState<number | null>(null);
  const [deliveryLatencyMs, setDeliveryLatencyMs] = useState<number | null>(null);
  const [secondsSinceData, setSecondsSinceData] = useState<number>(0);
  const [remoteConfigQueueValue, setRemoteConfigQueueValue] = useState<string>('Loading...');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getRemoteConfigValue('POKEMON_CENTER_QUEUE', 'Unavailable').then((value) => {
      if (!cancelled) {
        setRemoteConfigQueueValue(value);
      }
    }).catch((error: unknown) => {
      console.error('[Pulsar] Failed to fetch remote config test value.', error);
      if (!cancelled) {
        setRemoteConfigQueueValue('Unavailable');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleFcmMessage = (message: unknown): void => {
      if (!isSidepanelFcmMessage(message)) {
        return;
      }

      const title = message.notification.title ?? 'FCM Message Received';
      const body = message.notification.body ?? 'A new push payload arrived.';
      const receivedAt = message.receivedAtMs ?? Date.now();

      if (message.sentAtMs !== undefined) {
        setDeliveryLatencyMs(Math.max(0, receivedAt - message.sentAtMs));
      }
      else {
        setDeliveryLatencyMs(null);
      }

      setLastDataAt(receivedAt);
      setFcmToast({ title, body });
      if (toastTimeoutRef.current !== null) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setFcmToast(null);
        toastTimeoutRef.current = null;
      }, 5000);
    };

    browser.runtime.onMessage.addListener(handleFcmMessage);

    return () => {
      browser.runtime.onMessage.removeListener(handleFcmMessage);
      if (toastTimeoutRef.current !== null) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (lastDataAt === null) {
      setSecondsSinceData(0);
      return;
    }

    setSecondsSinceData(Math.floor((Date.now() - lastDataAt) / 1000));
    const intervalId = setInterval(() => {
      setSecondsSinceData(Math.floor((Date.now() - lastDataAt) / 1000));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [lastDataAt]);

  useFirebaseTokenRegistration(sessionToken);

  return (
    <div className="min-h-screen p-4">
      {authError !== null && (
        <div className="toast toast-bottom toast-center z-50 w-full max-w-xs">
          <div role="alert" className="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm">{authError}</span>
            <button type="button" className="btn btn-ghost btn-xs" aria-label="Dismiss" onClick={dismissAuthError}>\u{2715}</button>
          </div>
        </div>
      )}
      {fcmToast !== null && (
        <div className="toast toast-bottom toast-end z-40 w-full max-w-xs">
          <div role="status" className="alert alert-success shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{fcmToast.title}</p>
              <p className="truncate text-xs opacity-80">{fcmToast.body}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex w-full flex-col gap-4">
        <header className="rounded-box border border-base-300 bg-base-100 px-3 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-[clamp(0.5rem,1.2vw,0.75rem)]">
              <div className="grid h-[clamp(2rem,5vw,2.5rem)] w-[clamp(2rem,5vw,2.5rem)] shrink-0 place-items-center rounded-lg border border-dashed border-base-content/30 bg-base-200 text-[clamp(0.6rem,1.5vw,0.75rem)] font-semibold uppercase tracking-widest">
                Logo
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(0.75rem,1.7vw,0.875rem)] font-semibold">Pulsar</p>
                <p className="truncate text-[clamp(0.65rem,1.4vw,0.75rem)] opacity-60">Monitor Notification Companion</p>
              </div>
            </div>

            {user !== null ? (
              <div className="dropdown dropdown-end shrink-0">
                <div tabIndex={0} role="button" className="avatar cursor-pointer" aria-label="Account menu">
                  <div className="rounded-full [height:clamp(2rem,6vw,2.75rem)] [width:clamp(2rem,6vw,2.75rem)]">
                    {user.avatar !== '' ? (
                      <img
                        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                        alt={user.username}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center rounded-full bg-primary text-[clamp(0.7rem,2vw,1rem)] font-bold text-primary-content">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <ul tabIndex={0} className="dropdown-content menu menu-sm z-50 mt-2 w-40 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
                  <li className="menu-title px-2 py-1 text-xs opacity-60">{user.username}</li>
                  <li>
                    <button type="button" onClick={logout} className="text-error">
                      Log Out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-square shrink-0 transition-[width,height] duration-200 [height:clamp(2rem,6vw,2.75rem)] [width:clamp(2rem,6vw,2.75rem)]"
                aria-label="Sign in with Discord"
                disabled={isLoggingIn}
                onClick={() => { void handleDiscordLogin(); }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="transition-[width,height] duration-200 [height:clamp(0.9rem,2.8vw,1.35rem)] [width:clamp(0.9rem,2.8vw,1.35rem)]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.294.075.075 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.075.075 0 0 1 .079.009c.12.098.246.198.373.294a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.699.77 1.364 1.225 1.994a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.057c.5-4.761-.838-8.898-3.557-12.56a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156 0-1.193.964-2.157 2.157-2.157 1.193 0 2.157.964 2.157 2.157 0 1.191-.964 2.156-2.157 2.156zm7.975 0c-1.183 0-2.157-.965-2.157-2.156 0-1.193.964-2.157 2.157-2.157 1.193 0 2.157.964 2.157 2.157 0 1.191-.964 2.156-2.157 2.156z" />
                </svg>
                <span className="sr-only">Sign in with Discord</span>
              </button>
            )}
          </div>
        </header>

        <div className="card border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <h1 className="text-2xl font-bold">Hello world</h1>
            <p className="text-sm opacity-70">Your sidepanel is ready for the next step.</p>
            <div className="mt-4 border-t border-base-300 pt-3 text-xs opacity-60">
              Seconds since data: {lastDataAt === null ? 'Waiting for data' : secondsSinceData}
            </div>
            <div className="mt-1 text-xs opacity-60">
              FCM sent to received: {deliveryLatencyMs === null ? 'Unavailable (no sent timestamp in payload)' : `${deliveryLatencyMs} ms`}
            </div>
            <div className="mt-1 text-xs opacity-60">
              Remote Config POKEMON_CENTER_QUEUE: {remoteConfigQueueValue}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isSidepanelFcmMessage(message: unknown): message is SidepanelFcmMessage {
  if (message === null || typeof message !== 'object') {
    return false;
  }
  return (message as { type?: string }).type === 'PULSAR/FCM_SIDEPANEL_MESSAGE';
}
