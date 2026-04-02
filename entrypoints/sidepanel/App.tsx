/** @jsxImportSource react */

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import type { UserAccess } from '../logic/AccessCache.ts';
import type { UserPinger } from '../logic/UserPingerGroup.ts';
import { MessageType, MessagingService } from '../shared/MessagingService.ts';
import { AllUserGroupDisplay } from './components/mainPanel/AllUserGroupDisplay.tsx';
import { BreakdownUserGroupDisplay } from './components/mainPanel/BreakdownUserGroupDisplay.tsx';
import { CreateGroupDisplay } from './components/mainPanel/CreateGroupDisplay.tsx';
import { EditGroupDisplay } from './components/mainPanel/EditGroupDisplay.tsx';
import { type UseAuthentication, useAuthentication } from './hooks/useAuthentication.ts';
import { useFirebaseTokenRegistration } from './hooks/useFirebaseTokenRegistration.ts';

export function App(): ReactElement {
  const [upstart, setUpstart] = useState(false);

  // Authentication and Device Registration to FCM
  const appUseAuthentication: UseAuthentication = useAuthentication();
  useFirebaseTokenRegistration({ useAuthentication: appUseAuthentication });

  // Menu Control and State
  const [currentPanel, setCurrentPanel] = useState<'ALL_GROUP' | 'BREAKDOWN_GROUP' | 'CREATE_GROUP' | 'EDIT_GROUP'>('ALL_GROUP');
  const [panelGroupSelected, setPanelGroupSelected] = useState<UserPinger | null>(null);

  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isNarrowLayout, setIsNarrowLayout] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(globalThis.window.innerWidth);
  const [userPingerGroups, setUserPingerGroups] = useState<UserPinger[]>([]);
  const [guildsAvailable, setGuildsAvailable] = useState<Array<{ guildId: string; guildName: string; maxNotificationGroup: number }>>([]);

  // Toast Notification Control
  const [fcmToast, setFcmToast] = useState<{ title: string; body: string } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Metrics Control
  const [lastDataAt, setLastDataAt] = useState<number>(Date.now());
  const [connected, setConnected] = useState<'OK' | 'ERROR' | 'PENDING'>('PENDING');
  const [deliveryLatencyMs, setDeliveryLatencyMs] = useState<number | 'N/A'>('N/A');
  const [secondsSinceData, setSecondsSinceData] = useState<number | 'N/A'>('N/A');

  // Constants
  const cachedGroupNames = userPingerGroups.map((group) => group.name);

  // Message Processor
  useEffect(() => {
    const handle = (internal: unknown): void => {
      MessagingService.fstack<{
        status: 'OK' | 'ERROR' | 'PENDING';
      }>(
        MessageType.POST_STATUS,
        internal,
        async (message) => {
          if (message.status === 'OK') {
            setConnected('OK');
          }
          else {
            setConnected('ERROR');
          }

          await Promise.resolve();
        },
      );

      MessagingService.fstack<UserPinger[]>(
        MessageType.POST_USER_PINGER_GROUPS,
        internal,
        async (message) => {
          setUserPingerGroups(message);
          await Promise.resolve();
        },
      );

      MessagingService.fstack<{
        guildsById: Record<string, UserAccess>;
      }>(
        MessageType.POST_ACCESS_CACHE,
        internal,
        async (message) => {
          const nextGuilds = Object.values(message.guildsById ?? {})
            .map((guildAccess) => ({
              guildId: guildAccess.guildId,
              guildName: guildAccess.guildName,
              maxNotificationGroup: guildAccess.maxNotificationGroup,
            }))
            .sort((a, b) => a.guildName.localeCompare(b.guildName));
          setGuildsAvailable(nextGuilds);
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
        internal,
        async (message) => {
          const receivedAtMs = message.receivedAtMs ?? Date.now();
          if (message.sentAtMs !== undefined) {
            setDeliveryLatencyMs(receivedAtMs - message.sentAtMs);
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

  // Detect narrow layouts to switch expanded menu to overlay mode.
  useEffect(() => {
    const media = globalThis.matchMedia('(max-width: 600px)');
    const update = () => {
      setIsNarrowLayout(media.matches);
      setViewportWidth(globalThis.window.innerWidth);
    };
    update();
    media.addEventListener('change', update);
    globalThis.window.addEventListener('resize', update);
    return () => {
      media.removeEventListener('change', update);
      globalThis.window.removeEventListener('resize', update);
    };
  }, []);

  const clampedNarrowViewport = Math.max(320, Math.min(viewportWidth, 600));
  const narrowStartPx = 13.75 * 16; // Matches non-narrow min width at 600px handoff.
  const narrowEndPx = 0.49 * 320; // About half width at the smallest supported narrow viewport.
  const t = (600 - clampedNarrowViewport) / (600 - 320);
  const narrowRawWidthPx = narrowStartPx + (narrowEndPx - narrowStartPx) * t;
  const narrowMinReadablePx = 12 * 16;
  const narrowMaxAllowedPx = viewportWidth * 0.92;
  const narrowOverlayWidthPx = Math.min(narrowMaxAllowedPx, Math.max(narrowMinReadablePx, narrowRawWidthPx));
  const narrowOverlayWidth = `${narrowOverlayWidthPx}px`;
  const currentGroupCountByGuild = userPingerGroups.reduce<Record<string, number>>((accumulator, group) => {
    accumulator[group.guildId] = (accumulator[group.guildId] ?? 0) + 1;
    return accumulator;
  }, {});

  if (!upstart) {
    setUpstart(true);
    browser.runtime.sendMessage({ upstart: true }).catch(() => {
      // Initial Poll Failure is Non-Critical as Background Polling will Continue.
    });
    console.info('Pulsar Upstart Message Sent to Background.');
  }

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
                aria-label={isMenuExpanded ? 'Close Menu' : 'Open Menu'}
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
                <p className='truncate text-[clamp(0.65rem,1.4vw,0.75rem)] opacity-60'>Notification Companion</p>
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

        <div className='relative flex flex-1 gap-2 overflow-hidden'>
          {isNarrowLayout && isMenuExpanded && (
            <button
              type='button'
              className='absolute inset-0 z-20 rounded-box bg-gradient-to-r from-black/80 via-black/70 to-black/60'
              aria-label='Close Menu Overlay'
              onClick={() => setIsMenuExpanded(false)}
            />
          )}
          <aside
            id='sidepanel-persistent-menu'
            style={{
              width: isMenuExpanded ? (isNarrowLayout ? narrowOverlayWidth : '13.75rem') : '3.5rem',
              minWidth: isMenuExpanded ? (isNarrowLayout ? narrowOverlayWidth : '13.75rem') : '3.5rem',
              maxWidth: isMenuExpanded ? (isNarrowLayout ? narrowOverlayWidth : '13.75rem') : undefined,
            }}
            className={`flex shrink-0 flex-col rounded-box border border-base-300 bg-base-100 p-2 shadow-lg transition-[width] duration-300 ${isMenuExpanded ? '' : 'w-14'} ${isNarrowLayout && isMenuExpanded ? 'absolute inset-y-0 left-0 z-30' : ''}`}
            aria-label='Side menu'
          >
            <nav className='flex flex-col gap-1'>
              <button
                onClick={() => {
                  setCurrentPanel('CREATE_GROUP');
                  setPanelGroupSelected(null);
                  if (isNarrowLayout) {
                    setIsMenuExpanded(false);
                  }
                }}
                type='button'
                className={`btn btn-ghost btn-sm w-full ${isMenuExpanded ? 'justify-start gap-2 px-2 normal-case' : 'justify-center p-0'}`}
              >
                <span className='grid h-6 w-6 shrink-0 place-items-center rounded-md bg-base-200 text-xs font-bold'>+</span>
                <span
                  className={`whitespace-nowrap text-[clamp(0.65rem,1.05vw,0.875rem)] leading-none ${isMenuExpanded ? 'inline' : 'hidden'}`}
                  style={{ maxWidth: 'calc(100% - 2.5rem)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'middle' }}
                >
                  Create Group
                </span>
              </button>
              <button
                onClick={() => {
                  setCurrentPanel('ALL_GROUP');
                  setPanelGroupSelected(null);
                  if (isNarrowLayout) {
                    setIsMenuExpanded(false);
                  }
                }}
                type='button'
                className={`btn btn-ghost btn-sm w-full ${isMenuExpanded ? 'justify-start gap-2 px-2 normal-case' : 'justify-center p-0'}`}
              >
                <span className='grid h-6 w-6 shrink-0 place-items-center rounded-md bg-base-200 text-xs font-bold'>+</span>
                <span
                  className={`whitespace-nowrap text-[clamp(0.65rem,1.05vw,0.875rem)] leading-none ${isMenuExpanded ? 'inline' : 'hidden'}`}
                  style={{ maxWidth: 'calc(100% - 2.5rem)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'middle' }}
                >
                  Show All Groups
                </span>
              </button>
              <div className='my-2 border-t border-base-300/40' aria-hidden='true' />

              {/* Load Groups to UI. */}
              {userPingerGroups.map((group) => (
                <div key={group.ulid} className='relative flex items-center'>
                  <button
                    onClick={() => {
                      setCurrentPanel('BREAKDOWN_GROUP');
                      setPanelGroupSelected(group);
                      if (isNarrowLayout) {
                        setIsMenuExpanded(false);
                      }
                    }}
                    type='button'
                    className={`btn btn-ghost btn-sm w-full ${isMenuExpanded ? 'justify-start gap-2 px-2 normal-case min-w-0 text-left' : 'justify-center p-0'}`}
                  >
                    <span
                      className='tooltip tooltip-right grid h-6 w-6 shrink-0 place-items-center rounded-md bg-base-200 text-xs font-bold before:max-w-56 before:whitespace-normal before:break-normal before:text-left'
                      title={group.name}
                      data-tip={group.name}
                    >
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                    <span className={`min-w-0 ${isMenuExpanded ? 'mr-8 flex-1' : 'hidden'}`} style={{ minWidth: 0 }}>
                      <span
                        className='block truncate whitespace-nowrap leading-none text-ellipsis overflow-hidden'
                        style={{
                          fontSize: 'clamp(0.6rem, 1.1vw, 0.8rem)',
                          maxWidth: '100%',
                        }}
                        title={group.name}
                      >
                        {group.name}
                      </span>
                    </span>
                  </button>
                  {isMenuExpanded && (
                    <button
                      type='button'
                      className='absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs p-1'
                      title='Edit Group'
                      aria-label='Edit Group'
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPanel('EDIT_GROUP');
                        setPanelGroupSelected(group);
                        if (isNarrowLayout) {
                          setIsMenuExpanded(false);
                        }
                      }}
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z' />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
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

          <div className='card rounded-box flex-1 border border-base-300 bg-base-200 shadow-lg'>
            <div className={`card-body text-center ${currentPanel === 'CREATE_GROUP' ? 'px-2 sm:px-3' : ''}`}>
              {currentPanel === 'CREATE_GROUP'
                && <CreateGroupDisplay guilds={guildsAvailable} currentGroupCountByGuild={currentGroupCountByGuild} cachedGroupNames={cachedGroupNames} />}
              {currentPanel === 'ALL_GROUP'
                && <AllUserGroupDisplay />}
              {currentPanel === 'BREAKDOWN_GROUP' && panelGroupSelected !== null
                && <BreakdownUserGroupDisplay group={panelGroupSelected!} />}
              {currentPanel === 'EDIT_GROUP' && panelGroupSelected !== null
                && <EditGroupDisplay group={panelGroupSelected} />}
            </div>
          </div>
        </div>

        <footer className='mt-auto border-t border-base-300/60 px-1 pt-1 text-[10px] leading-relaxed opacity-50 min-h-[2.7em] md:min-h-0'>
          <div className='w-full flex items-center justify-between gap-1'>
            <button
              type='button'
              className='text-left text-[clamp(9px,2.5vw,12px)] focus:outline-none hover:opacity-80 active:scale-95 transition'
              title='Refresh'
              aria-label='Refresh Application'
              onClick={() => globalThis.window.location.reload()}
            >
              {connected === 'PENDING' ? '\u{1f7e1}' : connected === 'OK' ? '\u{1f7e2}' : '\u{1f534}'}
            </button>

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
                Designed for and Sponsored by{' '}
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
