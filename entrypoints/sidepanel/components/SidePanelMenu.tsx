import { type ReactElement, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import type { AccessCache, UserAccess } from '../../shared/cache.ts';
import { getEndpoint } from '../../shared/const.ts';
import { UseAuthentication } from '../hooks/useAuthentication.ts';

export function SidePanelMenu({ useAuthentication, isOpen, fcmAverage, lastMessage, onClose, onCreateGroup }: {
  useAuthentication: UseAuthentication;
  isOpen: boolean;
  fcmAverage: string;
  lastMessage: string;
  onClose: () => void;
  onCreateGroup?: () => void;
}): ReactElement {
  // Modal State Controls
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);

  // Models Validation State
  const [isInflightValidating, setIsInflightValidating] = useState(false);
  const [genericValidationReject, setGenericValidationReject] = useState<'InternalServerError' | 'REJECT' | 'OK'>('OK');
  const [guildValidationReject, setGuildValidationReject] = useState<'IF-GUILD-REJECT' | 'OK'>('OK');
  const [groupNameValidationReject, setGroupNameValidationReject] = useState<'IF-GROUP-NAME-REJECT' | 'OK'>('OK');

  // Guild Selector
  const [guildId, setGuildId] = useState<string>('');
  const [isGuildDropdownOpen, setIsGuildDropdownOpen] = useState(false);

  // Group Name Input
  const [groupName, setGroupName] = useState('');

  // Time Ranges
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [startMeridiem, setStartMeridiem] = useState<'AM' | 'PM'>('AM');
  const [endMeridiem, setEndMeridiem] = useState<'AM' | 'PM'>('PM');

  // Derived References to Components
  const guildDropdownRef = useRef<HTMLDivElement | null>(null);

  // Quick Helper Functions
  const TIME_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/;
  const isTimeValid = (value: string | null): boolean => value === null || TIME_REGEX.test(value);

  // Effect to Load Access Cache to Foreground from Background Script
  useEffect(() => {
    console.info('[SidepanelMenu] showCreateGroupModal or guildId changed, validating if access cache load is needed.', { showCreateGroupModal, guildId });
    // Prevent Run and Cleanup State on Close
    if (!showCreateGroupModal) {
      setIsGuildDropdownOpen(false);
      return;
    }

    // Call 'GET_ACCESS_CACHE' to Background Script to Get Access Cache for Guild List
    browser.runtime
      .sendMessage({ type: 'GET_ACCESS_CACHE' })
      .then((resp: Awaited<ReturnType<typeof AccessCache.getLatestData>>) => {
        if (resp && resp.guildsById) {
          setUserAccess(Object.values(resp.guildsById) as UserAccess[]);
        }
        else {
          setUserAccess([]);
        }
      });
    console.info('[SidepanelMenu] Requested Access Cache from background script for guild dropdown.', { showCreateGroupModal, guildId, userAccess });
  }, [showCreateGroupModal, genericValidationReject, guildValidationReject, groupNameValidationReject]);

  // Effect to Handle Click Outside of Guild Dropdown to Close Dropdown
  useEffect(() => {
    if (!isGuildDropdownOpen) {
      return;
    }

    const handleMouseDownOutside = (event: MouseEvent): void => {
      if (!guildDropdownRef.current?.contains(event.target as Node)) {
        setIsGuildDropdownOpen(false);
      }
    };

    globalThis.document.addEventListener('mousedown', handleMouseDownOutside);
    return () => {
      globalThis.document.removeEventListener('mousedown', handleMouseDownOutside);
    };
  }, [isGuildDropdownOpen]);

  // Effect to Validate Modal Input Fields with Debounce and Inflight API Validation
  useEffect(() => {
    if (!showCreateGroupModal || !guildId) {
      setIsInflightValidating(false);
      setGenericValidationReject('OK');
      setGuildValidationReject('OK');
      setGroupNameValidationReject('OK');
      return;
    }
    setIsInflightValidating(true);

    const validationDebounceTimeout = setTimeout(() => {
      const checkValidation = async (): Promise<void> => {
        // Set Validating Flag
        setIsInflightValidating(true);

        // Clear Rejections
        setGenericValidationReject('OK');

        try {
          if (useAuthentication.sessionToken === null) {
            return;
          }

          // Inflight Validation Endpoint Generation
          const validationTypes: ('IF-GUILD' | 'IF-GROUP-NAME')[] = ['IF-GUILD'];
          const guildInflightValidationEndpoint = new URL(getEndpoint('/ui/createUserGroup'));

          // Load Inflight Validations
          guildInflightValidationEndpoint.searchParams.set('guildId', guildId);
          if (groupName !== '') {
            validationTypes.push('IF-GROUP-NAME');
            guildInflightValidationEndpoint.searchParams.set('groupName', groupName);
          }

          // Perform Inflight Validation Request
          const guildInflightValidate = await fetch(guildInflightValidationEndpoint.toString(), {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${useAuthentication.sessionToken}`,
              'X-Validation-Types': validationTypes.join(','),
            },
          });

          if (!guildInflightValidate.ok || guildInflightValidate.status !== 204) {
            setGenericValidationReject('InternalServerError');
            return;
          }

          const headers = guildInflightValidate.headers.get('X-Failed-Inflights')?.split(',').map((s) => s.trim().toUpperCase()) ?? [];
          if (headers.includes('IF-GUILD')) {
            setGuildValidationReject('IF-GUILD-REJECT');
            return;
          }
          if (headers.includes('IF-GROUP-NAME')) {
            setGroupNameValidationReject('IF-GROUP-NAME-REJECT');
            return;
          }

          setGuildValidationReject('OK');
          setGroupNameValidationReject('OK');
          setIsInflightValidating(false);
        }
        catch (error) {
          console.error('[CreateGroup] Modal Validation Endpoint Error', error);
        }

        console.info('[CreateGroup] Modal Validation Endpoint Success', { guildValidationReject, groupNameValidationReject, isInflightValidating });
      };

      void checkValidation();
    }, 500);

    return () => {
      clearTimeout(validationDebounceTimeout);
    };
  }, [showCreateGroupModal, isGuildDropdownOpen, guildId, groupName]);

  return (
    <>
      {isOpen && (
        <button
          type='button'
          className='absolute inset-0 z-20 cursor-default rounded-box bg-base-content/25'
          aria-label='Close menu overlay'
          onClick={onClose}
        />
      )}

      <aside
        id='sidepanel-popout-menu'
        className={`absolute left-0 top-0 z-30 flex h-full w-48 flex-col rounded-box border border-base-300 bg-base-100 p-3 shadow-2xl transition-all duration-200 ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 pointer-events-none'}`}
        aria-label='Navigation menu'
      >
        <p className='mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-40'>Menu</p>
        <button
          type='button'
          className='btn btn-ghost btn-sm justify-start gap-3 px-2 normal-case'
          onClick={() => {
            onCreateGroup?.();
            setGuildId('');
            setGroupName('');
            setStartTime(null);
            setEndTime(null);
            setStartMeridiem('AM');
            setEndMeridiem('PM');
            setIsInflightValidating(false);
            setGenericValidationReject('InternalServerError');
            setGuildValidationReject('IF-GUILD-REJECT');
            setGroupNameValidationReject('IF-GROUP-NAME-REJECT');
            setShowCreateGroupModal(true);
          }}
        >
          <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4 shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
            <path d='M12 5v14' />
            <path d='M5 12h14' />
          </svg>
          <span className='truncate text-sm'>Create Group</span>
        </button>

        <div className='mt-auto border-t border-base-300/60 px-2 pt-3 text-left text-[10px] leading-relaxed opacity-50'>
          <p>Last Message: {lastMessage}</p>
          <p>FCM Average: {fcmAverage}</p>
        </div>
      </aside>

      <input type='checkbox' className='modal-toggle' checked={showCreateGroupModal} readOnly tabIndex={-1} />
      <div className={`modal ${showCreateGroupModal ? 'modal-open' : ''}`}>
        <div className='modal-box w-full max-w-md rounded-box bg-base-100 p-6 shadow-xl'>
          <h3 className='mb-4 text-lg font-bold'>Create Notification Group</h3>
          <div>
            <label className='form-control mt-6 w-full'>
              <span className='label-text mb-1'>Select Guild</span>
              <div className='relative' ref={guildDropdownRef}>
                <button
                  type='button'
                  className={`input input-bordered relative flex w-full items-center justify-center bg-base-200 text-center font-normal !outline-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none ${isGuildDropdownOpen ? 'rounded-b-none border-b-0 ring-1 ring-white/30' : ''}`}
                  aria-haspopup='listbox'
                  aria-expanded={isGuildDropdownOpen}
                  onClick={() => {
                    setIsGuildDropdownOpen((value) => !value);
                  }}
                >
                  <span className={`truncate text-center ${guildId ? '' : 'text-base-content/50'}`}>{guildId ? userAccess.find((guild) => guild.guildId === guildId)?.guildName : 'Select a Guild'}</span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className={`absolute right-3 h-4 w-4 shrink-0 transition-transform ${isGuildDropdownOpen ? 'rotate-180' : ''}`}
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <path d='m6 9 6 6 6-6' />
                  </svg>
                </button>
                {isGuildDropdownOpen && (
                  <ul
                    className='absolute left-0 right-0 top-full z-20 max-h-56 overflow-y-auto rounded-b-box border border-base-300 border-t-0 bg-base-200 shadow-lg ring-1 ring-white/30'
                    role='listbox'
                  >
                    {userAccess.length === 0 && <li className='px-3 py-2 text-sm text-base-content/60'>Unavailable</li>}
                    {userAccess.map((guild) => (
                      <li key={guild.guildId}>
                        <button
                          type='button'
                          className={`w-full bg-base-200 px-3 py-2 text-center text-sm hover:bg-base-300 ${guildId === guild.guildId ? 'bg-base-300 font-medium' : ''}`}
                          onClick={() => {
                            setGuildId(guild.guildId);
                            setIsGuildDropdownOpen(false);
                          }}
                        >
                          {guild.guildName}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className={`mt-1 block min-h-[1rem] w-full text-center text-[11px] ${guildValidationReject !== 'OK' ? 'text-error' : 'text-base-content/60'}`}>{guildValidationReject !== 'OK' ? 'Guild Limits Exceeded. Please delete an existing Notification Group.' : ''}</span>
            </label>
            <div className='h-2' aria-hidden='true' />
            <label className='form-control w-full'>
              <span className='mb-1 flex items-center justify-between'>
                <span className='label-text'>Group Name</span>
                <span className='text-[11px] text-base-content/60'>{groupName.length}/100</span>
              </span>
              <input
                className={`input input-bordered w-full bg-base-200 px-3 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${groupName.length > 0 && (groupNameValidationReject !== 'OK') ? 'input-error' : ''}`}
                type='text'
                value={groupName}
                maxLength={100}
                disabled={guildId === ''}
                placeholder='Pokemon TCG: Mega Evolution - Chaos Rising'
                onChange={(event) => {
                  setGroupName(event.target.value);
                }}
              />
              <span className={`mt-1 block min-h-[1rem] w-full text-center text-[11px] ${groupNameValidationReject !== 'OK' ? 'text-error' : 'text-base-content/60'}`}>{groupNameValidationReject !== 'OK' ? 'Invalid or Duplicate Group Name.' : ''}</span>
            </label>
            <div className='h-2' aria-hidden='true' />
            <div className='mb-6 grid grid-cols-2 gap-4'>
              <label className='form-control w-full'>
                <span className='label-text mb-1'>Notification Start Time</span>
                <div className='relative'>
                  <input
                    className={`input input-bordered w-full bg-base-200 px-3 text-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${(startTime === null && endTime !== null) || !isTimeValid(startTime) ? 'input-error' : ''}`}
                    type='text'
                    value={startTime ?? ''}
                    placeholder='08:00'
                    onChange={(event) => {
                      const formatted = formatTimeInput(event.target.value);
                      setStartTime(formatted === '' ? null : formatted);
                    }}
                  />
                  <div className='absolute bottom-1 right-1 top-1 z-10 flex w-10 flex-col overflow-hidden rounded-xl border border-base-300 bg-base-300/50'>
                    <button
                      type='button'
                      className={`h-1/2 text-[10px] font-semibold leading-none transition-colors ${startMeridiem === 'AM' ? 'bg-primary text-primary-content' : 'text-base-content/70 hover:bg-base-300'}`}
                      onClick={() => {
                        setStartMeridiem('AM');
                      }}
                    >
                      AM
                    </button>
                    <button
                      type='button'
                      className={`h-1/2 text-[10px] font-semibold leading-none transition-colors ${startMeridiem === 'PM' ? 'bg-primary text-primary-content' : 'text-base-content/70 hover:bg-base-300'}`}
                      onClick={() => {
                        setStartMeridiem('PM');
                      }}
                    >
                      PM
                    </button>
                  </div>
                </div>
                {startTime === null && endTime !== null && <span className='mt-1 block w-full text-center text-[11px] text-error'>Start Time Required</span>}
                {startTime !== null && !isTimeValid(startTime) && <span className='mt-1 block w-full text-center text-[11px] text-error'>Use 8:00 or 08:00 AM/PM</span>}
              </label>
              <label className='form-control w-full'>
                <span className='label-text mb-1'>Notification End Time</span>
                <div className='relative'>
                  <input
                    className={`input input-bordered w-full bg-base-200 px-3 text-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${(endTime === null && startTime !== null) || !isTimeValid(endTime) ? 'input-error' : ''}`}
                    type='text'
                    value={endTime ?? ''}
                    placeholder='08:00'
                    onChange={(event) => {
                      const formatted = formatTimeInput(event.target.value);
                      setEndTime(formatted === '' ? null : formatted);
                    }}
                  />
                  <div className='absolute bottom-1 right-1 top-1 z-10 flex w-10 flex-col overflow-hidden rounded-xl border border-base-300 bg-base-300/50'>
                    <button
                      type='button'
                      className={`h-1/2 text-[10px] font-semibold leading-none transition-colors ${endMeridiem === 'AM' ? 'bg-primary text-primary-content' : 'text-base-content/70 hover:bg-base-300'}`}
                      onClick={() => {
                        setEndMeridiem('AM');
                      }}
                    >
                      AM
                    </button>
                    <button
                      type='button'
                      className={`h-1/2 text-[10px] font-semibold leading-none transition-colors ${endMeridiem === 'PM' ? 'bg-primary text-primary-content' : 'text-base-content/70 hover:bg-base-300'}`}
                      onClick={() => {
                        setEndMeridiem('PM');
                      }}
                    >
                      PM
                    </button>
                  </div>
                </div>
                {endTime === null && startTime !== null && <span className='mt-1 block w-full text-center text-[11px] text-error'>End Time Required</span>}
                {endTime !== null && !isTimeValid(endTime) && <span className='mt-1 block w-full text-center text-[11px] text-error'>Use 8:00 or 08:00 AM/PM</span>}
              </label>
            </div>
          </div>
          <div className='flex justify-end gap-2'>
            <button className='btn btn-ghost' type='button' onClick={() => setShowCreateGroupModal(false)}>Cancel</button>
            <button className='btn btn-primary' type='button' disabled={!guildId || isInflightValidating || genericValidationReject !== 'OK' || guildValidationReject !== 'OK' || groupName.trim() === '' || ((startTime === null && endTime !== null) || (startTime !== null && endTime === null)) || !isTimeValid(startTime) || !isTimeValid(endTime)} onClick={() => setShowCreateGroupModal(false)}>Create</button>
          </div>
        </div>
        <label className='modal-backdrop' onClick={() => setShowCreateGroupModal(false)} />
      </div>
    </>
  );
}

function formatTimeInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length === 3) {
    return `${digits[0]}:${digits.slice(1)}`;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}
