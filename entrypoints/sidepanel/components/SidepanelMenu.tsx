/** @jsxImportSource react */

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import type { UserAccess } from '../../shared/accessCache.ts';
import { getEndpoint } from '../../shared/const.ts';

interface SidepanelMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup?: () => void;
}

type Meridiem = 'AM' | 'PM';

const TWELVE_HOUR_TIME_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/;

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

function getGuildValidationMessage(
  selectedGuildId: string,
  isGroupNameValid: boolean,
  isCheckingCreateGroupLimit: boolean,
  isCreateGroupLimitExceeded: boolean,
): string {
  if (!selectedGuildId) {
    return '';
  }

  if (isGroupNameValid && isCheckingCreateGroupLimit) {
    return 'Validation in Progress';
  }

  if (!isCheckingCreateGroupLimit && isCreateGroupLimitExceeded) {
    return 'Unable to Create: Group Limit Exceeded for Roles';
  }

  return '';
}

function getGroupNameValidationMessage(
  groupName: string,
  isGroupNameValid: boolean,
  isCheckingCreateGroupLimit: boolean,
  isCreateGroupDuplicateName: boolean,
): string {
  if (groupName.length > 0 && !isGroupNameValid) {
    return 'Unable to Create: Invalid Length for Group Name';
  }

  if (isGroupNameValid && !isCheckingCreateGroupLimit && isCreateGroupDuplicateName) {
    return 'Unable to Create: Duplicate Group Name';
  }

  return '';
}

export function SidepanelMenu({ isOpen, onClose, onCreateGroup }: SidepanelMenuProps): ReactElement {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [isGuildDropdownOpen, setIsGuildDropdownOpen] = useState(false);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [groupName, setGroupName] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [startMeridiem, setStartMeridiem] = useState<Meridiem>('AM');
  const [endMeridiem, setEndMeridiem] = useState<Meridiem>('PM');
  const [isInflightValidating, setIsInflightValidating] = useState(false);
  const [isCreateGroupReject, setIsCreateGroupReject] = useState<'InternalServerError' | 'REJECT' | 'OK'>('OK');
  const [isCreateGroupNameReject, setIsCreateGroupNameReject] = useState<'InternalServerError' | 'REJECT' | 'OK'>('OK');
  // const [isGroupNameValidated, setIsGroupNameValidated] = useState(false);
  const guildDropdownRef = useRef<HTMLDivElement | null>(null);

  const isValidTimeOrNull = (value: string | null): boolean => value === null || TWELVE_HOUR_TIME_REGEX.test(value);
  const trimmedGroupName = groupName.trim();
  const isGroupNameValid = trimmedGroupName.length >= 1 && trimmedGroupName.length <= 100;
  const hasStartTime = startTime !== null;
  const hasEndTime = endTime !== null;
  const isTimePairComplete = hasStartTime === hasEndTime;
  const isStartTimeValid = isValidTimeOrNull(startTime);
  const isEndTimeValid = isValidTimeOrNull(endTime);
  const isStartTimeMissing = !hasStartTime && hasEndTime;
  const isEndTimeMissing = hasStartTime && !hasEndTime;
  const selectedGuildName = userAccess.find((guild) => guild.guildId === selectedGuildId)?.guildName ?? 'Choose Guild';
  const guildValidationMessage = getGuildValidationMessage(
    selectedGuildId,
    isGroupNameValid,
    isInflightValidating,
    isCreateGroupReject,
  );
  const isGuildValidationError = selectedGuildId && !isInflightValidating && isCreateGroupReject;
  const groupNameValidationMessage = getGroupNameValidationMessage(
    groupName,
    isGroupNameValid,
    isInflightValidating,
    isCreateGroupNameReject,
  );
  const isGroupNameValidationError = groupNameValidationMessage !== '';

  useEffect(() => {
    if (!showCreateGroupModal) {
      setIsGuildDropdownOpen(false);
      return;
    }

    browser.runtime.sendMessage({ type: 'GET_ACCESS_CACHE' }).then((resp) => {
      if (resp && resp.guildsById) {
        setUserAccess(Object.values(resp.guildsById) as UserAccess[]);
      }
      else {
        setUserAccess([]);
      }
    });
  }, [showCreateGroupModal]);

  useEffect(() => {
    if (!isGuildDropdownOpen) {
      return;
    }

    const handleMouseDownOutside = (event: MouseEvent): void => {
      if (!guildDropdownRef.current?.contains(event.target as Node)) {
        setIsGuildDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDownOutside);
    return () => {
      document.removeEventListener('mousedown', handleMouseDownOutside);
    };
  }, [isGuildDropdownOpen]);

  useEffect(() => {
    if (!showCreateGroupModal || !selectedGuildId || !isGroupNameValid) {
      setIsInflightValidating(false);
      setIsCreateGroupReject('OK');
      setIsCreateGroupNameReject('OK');
      // setIsGroupNameValidated(false);
      return;
    }
    // setIsGroupNameValidated(false);

    const debounceTimer = setTimeout(() => {
      const checkCreateGroupLimit = async (): Promise<void> => {
        // Set Validating Flag
        setIsInflightValidating(true);

        // Clear Rejections
        setIsCreateGroupReject('OK');
        setIsCreateGroupNameReject('OK');

        try {
          const { sessionToken } = await browser.storage.local.get('sessionToken') as { sessionToken?: string };
          if (!sessionToken) {
            return;
          }

          const guildInflightValidationEndpoint = new URL(getEndpoint('/ui/createUserGroup'));
          guildInflightValidationEndpoint.searchParams.set('guildId', selectedGuildId);

          const guildInflightValidate = await fetch(guildInflightValidationEndpoint.toString(), {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
              'X-Validation-Type': 'X-INFLIGHT-GUILD',
            },
          });

          if (!guildInflightValidate.ok) {
            setIsCreateGroupReject('InternalServerError');
            return;
          }

          const groupNameInflightValidationEndpoint = new URL(getEndpoint('/ui/createUserGroup'));
          groupNameInflightValidationEndpoint.searchParams.set('guildId', selectedGuildId);
          groupNameInflightValidationEndpoint.searchParams.set('groupName', trimmedGroupName);

          const groupNameInflightValidate = await fetch(groupNameInflightValidationEndpoint.toString(), {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
              'X-Validation-Type': 'X-INFLIGHT-GROUP-NAME',
            },
          });

          // const exceedLimitHeader = guildInflightValidate.headers.get('X-CreateGroup-Exceed-Limit');
          // const duplicateNameHeader = groupNameInflightValidate.headers.get('X-CreateGroup-DuplicateName');
          // setIsCreateGroupLimitExceeded(exceedLimitHeader === '1');
          // setIsCreateGroupDuplicateName(duplicateNameHeader === '1');
        }
        catch (error) {
          console.error('[CreateGroup] Failed to check guild create-group limit.', error);
        }
      };

      void checkCreateGroupLimit();
    }, 500);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [isGroupNameValid, selectedGuildId, showCreateGroupModal, trimmedGroupName]);

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
            setSelectedGuildId('');
            setGroupName('');
            setStartTime(null);
            setEndTime(null);
            setStartMeridiem('AM');
            setEndMeridiem('PM');
            setIsInflightValidating(false);
            setIsCreateGroupReject('REJECT');
            setIsCreateGroupNameReject('REJECT');
            setShowCreateGroupModal(true);
          }}
        >
          <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4 shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
            <path d='M12 5v14' />
            <path d='M5 12h14' />
          </svg>
          <span className='truncate text-sm'>Create Group</span>
        </button>
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
                  <span className={`truncate text-center ${selectedGuildId ? '' : 'text-base-content/50'}`}>{selectedGuildName}</span>
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
                          className={`w-full bg-base-200 px-3 py-2 text-center text-sm hover:bg-base-300 ${selectedGuildId === guild.guildId ? 'bg-base-300 font-medium' : ''}`}
                          onClick={() => {
                            setSelectedGuildId(guild.guildId);
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
              <span className={`mt-1 block min-h-[1rem] w-full text-center text-[11px] ${isGuildValidationError ? 'text-error' : 'text-base-content/60'}`}>{guildValidationMessage}</span>
            </label>
            <div className='h-2' aria-hidden='true' />
            <label className='form-control w-full'>
              <span className='mb-1 flex items-center justify-between'>
                <span className='label-text'>Group Name</span>
                <span className='text-[11px] text-base-content/60'>{groupName.length}/100</span>
              </span>
              <input
                className={`input input-bordered w-full bg-base-200 px-3 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${groupName.length > 0 && (!isGroupNameValid || isCreateGroupNameReject) ? 'input-error' : ''}`}
                type='text'
                value={groupName}
                maxLength={100}
                placeholder='Pokemon TCG: Mega Evolution - Chaos Rising'
                onChange={(event) => {
                  setGroupName(event.target.value);
                }}
              />
              <span className={`mt-1 block min-h-[1rem] w-full text-center text-[11px] ${isGroupNameValidationError ? 'text-error' : 'text-base-content/60'}`}>{groupNameValidationMessage}</span>
            </label>
            <div className='h-2' aria-hidden='true' />
            <div className='mb-6 grid grid-cols-2 gap-4'>
              <label className='form-control w-full'>
                <span className='label-text mb-1'>Start Time</span>
                <div className='relative'>
                  <input
                    className={`input input-bordered w-full bg-base-200 px-3 text-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${isStartTimeMissing || (startTime !== null && !isStartTimeValid) ? 'input-error' : ''}`}
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
                {isStartTimeMissing && <span className='mt-1 block w-full text-center text-[11px] text-error'>Start and End Time Required</span>}
                {startTime !== null && !isStartTimeValid && <span className='mt-1 block w-full text-center text-[11px] text-error'>Use 8:00 or 08:00 AM/PM</span>}
              </label>
              <label className='form-control w-full'>
                <span className='label-text mb-1'>End Time</span>
                <div className='relative'>
                  <input
                    className={`input input-bordered w-full bg-base-200 px-3 text-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${isEndTimeMissing || (endTime !== null && !isEndTimeValid) ? 'input-error' : ''}`}
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
                {isEndTimeMissing && <span className='mt-1 block w-full text-center text-[11px] text-error'>Start and End Time Required</span>}
                {endTime !== null && !isEndTimeValid && <span className='mt-1 block w-full text-center text-[11px] text-error'>Use 8:00 or 08:00 AM/PM</span>}
              </label>
            </div>
          </div>
          <div className='flex justify-end gap-2'>
            <button className='btn btn-ghost' type='button' onClick={() => setShowCreateGroupModal(false)}>Cancel</button>
            <button className='btn btn-primary' type='button' disabled={!selectedGuildId || !isGroupNameValid || !isGroupNameValidated || !isTimePairComplete || !isStartTimeValid || !isEndTimeValid || isInflightValidating || isCreateGroupReject || isCreateGroupNameReject} onClick={() => setShowCreateGroupModal(false)}>Create</button>
          </div>
        </div>
        <label className='modal-backdrop' onClick={() => setShowCreateGroupModal(false)} />
      </div>
    </>
  );
}
