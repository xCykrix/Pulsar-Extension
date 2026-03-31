/** @jsxImportSource react */

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { MessageType, MessagingService } from '../shared/MessagingService.ts';
import { MarqueeText } from './components/utility/MarqueeText.tsx';
import { type UseAuthentication, useAuthentication } from './hooks/useAuthentication.ts';
import { useFirebaseTokenRegistration } from './hooks/useFirebaseTokenRegistration.ts';

export function App(): ReactElement {
  // Authentication and Device Registration to FCM
  const appUseAuthentication: UseAuthentication = useAuthentication();
  useFirebaseTokenRegistration({ useAuthentication: appUseAuthentication });

  // Menu Control
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  // Toast Notification Control
  const [fcmToast, setFcmToast] = useState<{ title: string; body: string } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Metrics Control
  const [lastDataAt, setLastDataAt] = useState<number>(Date.now());
  const [connected, setConnected] = useState<'OK' | 'ERROR' | 'PENDING'>('PENDING');
  const [deliveryLatencyMs, setDeliveryLatencyMs] = useState<number | 'N/A'>('N/A');
  const [secondsSinceData, setSecondsSinceData] = useState<number | 'N/A'>('N/A');

  // Message Processor
  useEffect(() => {
    const handle = (message: unknown): void => {
      MessagingService.fstack<{
        status: 'OK' | 'ERROR' | 'PENDING';
      }>(
        MessageType.STATUS_CHECK,
        message,
        async (statusMessage) => {
          if (statusMessage.status === 'OK') {
            setConnected('OK');
          }
          else {
            setConnected('ERROR');
          }

          await Promise.resolve();
        },
      );

      MessagingService.fstack<{
        notification: {
          title?: string;
          body?: string;
        };
        sentAtMs?: number;
        receivedAtMs?: number;
      }>(
        MessageType.FCM_NOTIFICATION,
        message,
        async (fcm) => {
          const receivedAtMs = fcm.receivedAtMs ?? Date.now();
          if (fcm.sentAtMs !== undefined) {
            setDeliveryLatencyMs(receivedAtMs - fcm.sentAtMs);
          }
          setLastDataAt(receivedAtMs);
          // setFcmToast({ title, body });

          if (toastTimeoutRef.current !== null) {
            clearTimeout(toastTimeoutRef.current);
          }
          toastTimeoutRef.current = setTimeout(() => {
            setFcmToast(null);
            toastTimeoutRef.current = null;
          }, 5000);

          await Promise.resolve();
        },
      );
    };
    browser.runtime.onMessage.addListener(handle);

    return () => {
      browser.runtime.onMessage.removeListener(handle);
      if (toastTimeoutRef.current !== null) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, [toastTimeoutRef]);

  // Tick Seconds Since Data Interval
  useEffect(() => {
    if (lastDataAt === null) {
      setSecondsSinceData('N/A');
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

  return (
    <div className='flex min-h-screen flex-col bg-base-300 p-4'>
      {appUseAuthentication.authError !== null && (
        <div className='toast toast-bottom toast-center z-50 w-full max-w-xs'>
          <div role='alert' className='alert alert-error shadow-lg'>
            <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
              <circle cx='12' cy='12' r='10' />
              <line x1='12' y1='8' x2='12' y2='12' />
              <line x1='12' y1='16' x2='12.01' y2='16' />
            </svg>
            <span className='text-sm'>{appUseAuthentication.authError}</span>
            <button type='button' className='btn btn-ghost btn-xs' aria-label='Dismiss' onClick={appUseAuthentication.dismissAuthError}>\u{2715}</button>
          </div>
        </div>
      )}
      {fcmToast !== null && (
        <div className='toast toast-bottom toast-end z-40 w-full max-w-xs'>
          <div role='status' className='alert alert-success shadow-lg'>
            <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
              <path d='M9 12l2 2 4-4' />
              <circle cx='12' cy='12' r='10' />
            </svg>
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold'>{fcmToast.title}</p>
              <p className='truncate text-xs opacity-80'>{fcmToast.body}</p>
            </div>
          </div>
        </div>
      )}
      <div className='flex flex-1 flex-col gap-2'>
        <header className='rounded-box border border-base-300 bg-base-200 px-3 py-3 shadow-sm'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-[clamp(0.5rem,1.2vw,0.75rem)]'>
              <button
                type='button'
                className='btn btn-ghost btn-square btn-sm shrink-0'
                aria-label={isMenuExpanded ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuExpanded}
                aria-controls='sidepanel-persistent-menu'
                onClick={() => {
                  setIsMenuExpanded((current) => !current);
                }}
              >
                <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                  <line x1='4' y1='7' x2='20' y2='7' />
                  <line x1='4' y1='12' x2='20' y2='12' />
                  <line x1='4' y1='17' x2='20' y2='17' />
                </svg>
              </button>
              <div className='grid h-[clamp(2rem,5vw,2.5rem)] w-[clamp(2rem,5vw,2.5rem)] shrink-0 place-items-center rounded-lg border border-dashed border-base-content/30 bg-base-200 text-[clamp(0.6rem,1.5vw,0.75rem)] font-semibold uppercase tracking-widest'>
                Logo
              </div>
              <div className='min-w-0'>
                <p className='text-[clamp(0.75rem,1.7vw,0.875rem)] font-semibold'>Pulsar</p>
                <p className='truncate text-[clamp(0.65rem,1.4vw,0.75rem)] opacity-60'>Monitor Notification Companion</p>
              </div>
            </div>

            {appUseAuthentication.user !== null
              ? (
                <div className='dropdown dropdown-end shrink-0'>
                  <div tabIndex={0} role='button' className='avatar cursor-pointer' aria-label='Account menu'>
                    <div className='rounded-full [height:clamp(2rem,6vw,2.75rem)] [width:clamp(2rem,6vw,2.75rem)]'>
                      {appUseAuthentication.user.avatar !== ''
                        ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${appUseAuthentication.user.id}/${appUseAuthentication.user.avatar}.png`}
                            alt={appUseAuthentication.user.username}
                            referrerPolicy='no-referrer'
                          />
                        )
                        : (
                          <div className='grid h-full w-full place-items-center rounded-full bg-primary text-[clamp(0.7rem,2vw,1rem)] font-bold text-primary-content'>
                            {appUseAuthentication.user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                    </div>
                  </div>
                  <ul tabIndex={0} className='dropdown-content menu menu-sm z-50 mt-2 w-40 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg'>
                    <li className='menu-title px-2 py-1 text-xs opacity-60'>{appUseAuthentication.user.username}</li>
                    <li>
                      <button type='button' onClick={appUseAuthentication.logOutSession} className='text-error'>
                        Log Out
                      </button>
                    </li>
                  </ul>
                </div>
              )
              : (
                <button
                  type='button'
                  className='btn btn-primary btn-square shrink-0 transition-[width,height] duration-200 [height:clamp(2rem,6vw,2.75rem)] [width:clamp(2rem,6vw,2.75rem)]'
                  aria-label='Sign in with Discord'
                  disabled={appUseAuthentication.isLoggingIn}
                  onClick={() => {
                    void appUseAuthentication.startDiscordLogin();
                  }}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    className='transition-[width,height] duration-200 [height:clamp(0.9rem,2.8vw,1.35rem)] [width:clamp(0.9rem,2.8vw,1.35rem)]'
                    fill='currentColor'
                    aria-hidden='true'
                  >
                    <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.294.075.075 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.075.075 0 0 1 .079.009c.12.098.246.198.373.294a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.699.77 1.364 1.225 1.994a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.057c.5-4.761-.838-8.898-3.557-12.56a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156 0-1.193.964-2.157 2.157-2.157 1.193 0 2.157.964 2.157 2.157 0 1.191-.964 2.156-2.157 2.156zm7.975 0c-1.183 0-2.157-.965-2.157-2.156 0-1.193.964-2.157 2.157-2.157 1.193 0 2.157.964 2.157 2.157 0 1.191-.964 2.156-2.157 2.156z' />
                  </svg>
                  <span className='sr-only'>Sign in with Discord</span>
                </button>
              )}
          </div>
        </header>

        <div className='flex flex-1 gap-2 overflow-hidden'>
          <aside
            id='sidepanel-persistent-menu'
            className={`flex shrink-0 flex-col rounded-box border border-base-300 bg-base-100 p-2 shadow-lg transition-[width] duration-300 ${isMenuExpanded ? 'w-[25%] min-w-[10rem]' : 'w-14'}`}
            aria-label='Side menu'
          >
            <nav className='flex flex-col gap-1'>
              <button type='button' className={`btn btn-ghost btn-sm w-full ${isMenuExpanded ? 'justify-start gap-2 px-2 normal-case' : 'justify-center p-0'}`}>
                <span className='grid h-6 w-6 shrink-0 place-items-center rounded-md bg-base-200 text-xs font-bold'>＋</span>
                <span className={`whitespace-nowrap text-[clamp(0.65rem,1.05vw,0.875rem)] leading-none ${isMenuExpanded ? 'inline' : 'hidden'}`}>Create Group</span>
              </button>
              <div className='my-2 border-t border-base-300/40' aria-hidden='true' />
              <button type='button' className={`btn btn-ghost btn-sm ${isMenuExpanded ? 'justify-start gap-2 px-2 normal-case' : 'justify-center p-0'}`}>
                <span className='grid h-6 w-6 shrink-0 place-items-center rounded-md bg-base-200 text-xs font-bold'>E</span>
                {isMenuExpanded ? <MarqueeText hold={5000} className='truncate text-[clamp(0.6rem,1.0vw,0.8125rem)]'>Ascended Heroes Elite Trainer Box</MarqueeText> : null}
              </button>
              <button type='button' className={`btn btn-ghost btn-sm ${isMenuExpanded ? 'justify-start gap-2 px-2 normal-case' : 'justify-center p-0'}`}>
                <span className='grid h-6 w-6 shrink-0 place-items-center rounded-md bg-base-200 text-xs font-bold'>E</span>
                {isMenuExpanded ? <MarqueeText hold={5000} className='truncate text-[clamp(0.6rem,1.0vw,0.8125rem)]'>Test</MarqueeText> : null}
              </button>
            </nav>

            <div className='mt-auto rounded-lg border border-base-300/70 bg-base-200/70 p-2 text-[10px] leading-relaxed opacity-70'>
              {isMenuExpanded
                ? (
                  <>
                    <p>Last Message: {secondsSinceData === 'N/A' ? 'N/A' : `${secondsSinceData}s`}</p>
                    <p>FCM Average: {deliveryLatencyMs === 'N/A' ? 'N/A' : `${Math.floor(deliveryLatencyMs / 1000)}s`}</p>
                  </>
                )
                : (
                  <div className='flex flex-col items-center gap-0'>
                    <span className='text-xs font-semibold'>
                      {secondsSinceData === 'N/A' ? 'N/A' : `${secondsSinceData}s`}
                    </span>
                    <span className='text-[10px] opacity-70'>
                      {deliveryLatencyMs === 'N/A' ? 'N/A' : `${Math.floor(deliveryLatencyMs / 1000)}s`}
                    </span>
                  </div>
                )}
            </div>
          </aside>

          <div className='card flex-1 border border-base-300 bg-base-200 shadow-lg'>
            <div className='card-body text-center'>
              <h1 className='text-2xl font-bold'>(...)</h1>
            </div>
          </div>
        </div>

        <footer className='mt-auto border-t border-base-300/60 px-1 pt-1 text-[10px] leading-relaxed opacity-50 min-h-[2.7em] md:min-h-0'>
          <div className='w-full flex items-center justify-between gap-1'>
            <span className='text-left text-[clamp(9px,2.5vw,12px)]'>
              {connected === 'PENDING' ? '\u{1f7e1}' : connected === 'OK' ? '\u{1f7e2}' : '\u{1f534}'}
            </span>

            <span className='flex flex-col items-end text-right text-[clamp(9px,2.5vw,12px)] max-w-[65%]'>
              <span className='whitespace-nowrap truncate max-w-full'>
                Copyright (c) 2026 - Pulsar by{' '}
                <a
                  className='link link-hover font-medium whitespace-nowrap'
                  href='https://github.com/amethyst-studio'
                  rel='noreferrer'
                  target='_blank'
                >
                  Amethyst&nbsp;Studio
                </a>
              </span>
              <span className='whitespace-nowrap truncate max-w-full mt-1'>
                Sponsored by{' '}
                <a
                  className='link link-hover font-medium'
                  href='https://passivecollectibles.com/'
                  rel='noreferrer'
                  target='_blank'
                >
                  Passive Collectibles
                </a>
              </span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
