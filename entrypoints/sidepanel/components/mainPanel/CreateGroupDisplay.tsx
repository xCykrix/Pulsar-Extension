/** @jsxImportSource react */

import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { TimeInput } from './components/TimeInput.tsx';

interface CreateGroupDisplayProps {
  guilds: Array<{ guildId: string; guildName: string; maxNotificationGroup: number }>;
  currentGroupCountByGuild: Record<string, number>;
  cachedGroupNames: string[];
}

export function CreateGroupDisplay({ guilds, currentGroupCountByGuild, cachedGroupNames }: CreateGroupDisplayProps): ReactElement {
  const capacityReachedMessage = 'Limit Reached. Please edit or delete an existing Notification Group.';
  const shouldEnableGuildScroll = guilds.length > 3;
  const [isGuildMenuOpen, setIsGuildMenuOpen] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Active Time Window state
  const [useActiveTimeWindow, setUseActiveTimeWindow] = useState(false);
  const [startTimeObj, setStartTimeObj] = useState<{ time: string; meridiem: 'AM' | 'PM' }>({ time: '', meridiem: 'AM' });
  const [endTimeObj, setEndTimeObj] = useState<{ time: string; meridiem: 'AM' | 'PM' }>({ time: '', meridiem: 'PM' });
  const [startTimeError, setStartTimeError] = useState<string | null>(null);
  const [endTimeError, setEndTimeError] = useState<string | null>(null);

  // Clear time inputs when toggle is turned off
  useEffect(() => {
    if (!useActiveTimeWindow) {
      setStartTimeObj({ time: '', meridiem: 'AM' });
      setEndTimeObj({ time: '', meridiem: 'PM' });
      setStartTimeError(null);
      setEndTimeError(null);
      return;
    }

    // Accepts 3 or 4 digits: 800, 0800, 930, 0930, 1200, etc.
    const time12hRegex = /^(0?[1-9]|1[0-2])[0-5][0-9]$/;
    const startFilled = startTimeObj.time && (startTimeObj.time.length === 3 || startTimeObj.time.length === 4);
    const endFilled = endTimeObj.time && (endTimeObj.time.length === 3 || endTimeObj.time.length === 4);

    let startErr: string | null = null;
    let endErr: string | null = null;

    // 1. Validate 12-hour time format
    // Pad to 4 digits for regex test
    const padTime = (t: string) => t.length === 3 ? `0${t}` : t;
    if (startFilled && !time12hRegex.test(padTime(startTimeObj.time))) {
      startErr = 'Invalid 12-hour time (hhmm)';
    }
    if (endFilled && !time12hRegex.test(padTime(endTimeObj.time))) {
      endErr = 'Invalid 12-hour time (hhmm)';
    }

    // 2. If either is specified, both must be specified
    if ((startFilled && !endFilled) || (!startFilled && endFilled)) {
      if (!startFilled) {
        startErr = 'Start time required if end time set';
      }
      if (!endFilled) {
        endErr = 'End time required if start time set';
      }
    }

    // 3 & 4. Start cannot be after end, end cannot be before start
    if (
      startFilled && endFilled
      && time12hRegex.test(padTime(startTimeObj.time))
      && time12hRegex.test(padTime(endTimeObj.time))
    ) {
      // Convert to minutes since midnight for comparison
      const parse = (t: string, mer: 'AM' | 'PM') => {
        const padded = t.length === 3 ? `0${t}` : t;
        let h = parseInt(padded.slice(0, 2), 10);
        const m = parseInt(padded.slice(2, 4), 10);
        if (h === 12) {
          h = 0;
        }
        let mins = h * 60 + m;
        if (mer === 'PM') {
          mins += 12 * 60;
        }
        return mins;
      };
      const startMins = parse(startTimeObj.time, startTimeObj.meridiem);
      const endMins = parse(endTimeObj.time, endTimeObj.meridiem);
      if (startMins > endMins) {
        startErr = 'Start time cannot be after end time';
        endErr = 'End time cannot be before start time';
      }
    }

    setStartTimeError(startErr);
    setEndTimeError(endErr);
  }, [useActiveTimeWindow, startTimeObj, endTimeObj]);

  const selectedGuildName = useMemo(() => {
    return guilds.find((guild) => guild.guildId === selectedGuildId)?.guildName ?? 'Select Guild';
  }, [guilds, selectedGuildId]);

  const normalizedExistingNames = useMemo(() => {
    return new Set(cachedGroupNames.map((name) => name.trim().toLowerCase()));
  }, [cachedGroupNames]);

  const trimmedGroupName = groupNameInput.trim();
  const isGroupNameTaken = trimmedGroupName.length > 0 && normalizedExistingNames.has(trimmedGroupName.toLowerCase());
  const groupNameInputFontSize = useMemo(() => {
    const maxFontSizeRem = 0.75;
    const minFontSizeRem = 0.62;
    const shrinkStartLength = 10;
    const maxLength = 30;

    if (groupNameInput.length <= shrinkStartLength) {
      return `${maxFontSizeRem}rem`;
    }

    const progress = Math.min(1, (groupNameInput.length - shrinkStartLength) / (maxLength - shrinkStartLength));
    const nextFontSize = maxFontSizeRem - ((maxFontSizeRem - minFontSizeRem) * progress);
    return `${nextFontSize.toFixed(3)}rem`;
  }, [groupNameInput.length]);

  useEffect(() => {
    const clickOutsideListener = (event: MouseEvent): void => {
      if (menuRef.current !== null && !menuRef.current.contains(event.target as Node)) {
        setIsGuildMenuOpen(false);
      }
    };

    globalThis.document.addEventListener('mousedown', clickOutsideListener);
    return () => {
      globalThis.document.removeEventListener('mousedown', clickOutsideListener);
    };
  }, []);

  return (
    <div className='flex h-full flex-col items-center justify-start'>
      <h1 className='text-1xl font-bold'>Create Notification Group</h1>

      <div className='mt-2 w-full max-w-md self-center px-0 text-center sm:px-1'>
        <p className='text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-base-content/60'>Guild</p>

        <div ref={menuRef} className='relative mt-1'>
          <button
            type='button'
            className='btn btn-outline relative w-full justify-center rounded-xl border-base-300/80 bg-base-100/95 px-3 normal-case shadow-sm transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            aria-haspopup='listbox'
            aria-expanded={isGuildMenuOpen}
            disabled={guilds.length === 0}
            onClick={() => setIsGuildMenuOpen((previous) => !previous)}
          >
            <span className='min-w-0 truncate text-center text-xs'>{selectedGuildName}</span>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
              className={`absolute right-3 h-4 w-4 shrink-0 transition-transform duration-200 ${isGuildMenuOpen ? 'rotate-180' : 'rotate-0'}`}
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
            </svg>
          </button>

          <div
            className={`absolute left-0 right-0 z-20 mt-1 origin-top rounded-xl border border-base-300/80 bg-base-100/95 p-1 shadow-lg backdrop-blur-sm transition-all duration-200 ${isGuildMenuOpen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-95 opacity-0'}`}
          >
            <ul
              role='listbox'
              className={`space-y-1 ${shouldEnableGuildScroll ? 'max-h-32 overflow-y-auto overscroll-contain' : 'overflow-visible'}`}
            >
              {guilds.length === 0 ? <li className='rounded-lg px-2 py-2 text-center text-xs text-base-content/70'>Unavailable</li> : guilds.map((guild) => (
                <li key={guild.guildId}>
                  {(() => {
                    const used = currentGroupCountByGuild[guild.guildId] ?? 0;
                    const isAtCapacity = used >= guild.maxNotificationGroup;
                    return (
                      <span
                        className={`block ${isAtCapacity ? 'tooltip tooltip-bottom before:max-w-64 before:whitespace-normal before:text-left' : ''}`}
                        data-tip={isAtCapacity ? capacityReachedMessage : undefined}
                        title={isAtCapacity ? capacityReachedMessage : undefined}
                      >
                        <button
                          type='button'
                          disabled={isAtCapacity}
                          className={`w-full rounded-lg px-2 py-2 text-center text-xs transition-colors duration-150 ${isAtCapacity ? 'cursor-not-allowed opacity-50' : ''} ${selectedGuildId === guild.guildId ? 'bg-primary/15 text-primary' : 'hover:bg-base-200'}`}
                          onClick={() => {
                            setSelectedGuildId(guild.guildId);
                            setIsGuildMenuOpen(false);
                          }}
                        >
                          {guild.guildName}
                          <span className='ml-1 opacity-60'>({used}/{guild.maxNotificationGroup})</span>
                        </button>
                      </span>
                    );
                  })()}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {selectedGuildId !== '' && (
          <div className='mt-3 text-left'>
            <label htmlFor='create-group-name' className='block text-center text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-base-content/60'>
              Group Name
            </label>
            <div className='relative mt-1 w-full'>
              <input
                id='create-group-name'
                type='text'
                value={groupNameInput}
                maxLength={30}
                placeholder='Enter Group Name'
                className={`input input-bordered w-full placeholder:text-xs text-center ${isGroupNameTaken ? 'input-error' : ''}`}
                style={{ fontSize: groupNameInputFontSize }}
                onChange={(event) => {
                  setGroupNameInput(event.target.value.slice(0, 30));
                }}
              />
              <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.63rem] ${isGroupNameTaken ? 'text-error' : 'text-base-content/60'}`} style={{ width: '2rem', textAlign: 'right' }}>
                {groupNameInput.length}/30
              </span>
            </div>
            {isGroupNameTaken && <div className='mt-1 text-[0.63rem] text-error'>Provided Group Name must be Unique.</div>}

            {/* Active Time Window Step */}
            {!isGroupNameTaken && groupNameInput.trim().length > 0 && (
              <div className='mt-6 flex flex-col items-center'>
                <label className='flex items-center gap-2 cursor-pointer mb-4'>
                  <input
                    type='checkbox'
                    className='toggle toggle-primary'
                    checked={useActiveTimeWindow}
                    onChange={() => setUseActiveTimeWindow((v) => !v)}
                  />
                  <span className='text-[0.85rem] font-medium'>Active Time Window</span>
                </label>
                <div className='flex flex-col items-center w-full max-w-xs'>
                  <div className='flex w-full justify-center items-start gap-1'>
                    <div className='flex-1 min-w-0'>
                      <TimeInput
                        label='Start Time'
                        value={startTimeObj}
                        onChange={setStartTimeObj}
                        disabled={!useActiveTimeWindow}
                        error={startTimeError ?? undefined}
                      />
                    </div>
                    <div className='flex items-start pt-7 h-full'>
                      <div className='border-l border-base-300 h-10 mx-1'></div>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <TimeInput
                        label='End Time'
                        value={endTimeObj}
                        onChange={setEndTimeObj}
                        disabled={!useActiveTimeWindow}
                        error={endTimeError ?? undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
