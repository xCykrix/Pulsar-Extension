/** @jsxImportSource react */

import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { KeywordInput } from './components/KeywordInput.tsx';
import { TimeInput } from './components/TimeInput.tsx';
import { KeywordParser } from './components/util/KeywordParser.ts';

interface CreateGroupDisplayProps {
  guilds: Array<{
    guildId: string;
    guildName: string;
    maxNotificationGroup: number;
    maxKeywordsPerNotificationGroup: number;
  }>;
  currentGroupCountByGuild: Record<string, number>;
  cachedGroupNames: string[];
}

export function CreateGroupDisplay({ guilds, currentGroupCountByGuild, cachedGroupNames }: CreateGroupDisplayProps): ReactElement {
  // Guild State
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [isGuildMenuOpen, setIsGuildMenuOpen] = useState(false);
  const shouldEnableGuildScroll = guilds.length > 3;
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Group Name State
  const [groupNameInput, setGroupNameInput] = useState('');

  // Keyword State
  const [keywords, setKeywords] = useState('');
  const parsedKeywords = useMemo(() => KeywordParser.parseKeyword(keywords), [keywords]);
  const keywordCount = Array.isArray(parsedKeywords) ? parsedKeywords.length : 0;
  const keywordError = useMemo(() => {
    if (keywordCount === null) {
      return 'Failed to Parse Keywords. Please check your syntax or contact support.';
    }
    if (keywordCount === 0) {
      return 'You must specify at least one positive or negative keyword.';
    }
    return undefined;
  }, [parsedKeywords, keywordCount]);

  // Active Time Window State
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
    }
  }, [useActiveTimeWindow]);

  // Validate Time Input (Strict)
  useEffect(() => {
    if (!useActiveTimeWindow) {
      return;
    }
    setStartTimeError(null);
    setEndTimeError(null);

    // Accepts 3 or 4 digits: 800, 0800, 930, 0930, 1200, etc.
    const time12h = /^(0?[1-9]|1[0-2])[0-5][0-9]$/;
    const hasStartTimeInput = startTimeObj.time && (startTimeObj.time.length === 3 || startTimeObj.time.length === 4);
    const hasEndTimeInput = endTimeObj.time && (endTimeObj.time.length === 3 || endTimeObj.time.length === 4);

    // Pad to 4 Digits from Start
    const startPadded = startTimeObj.time.padStart(4, '0');
    const endPadded = endTimeObj.time.padStart(4, '0');

    // If any input is present, it must be valid
    if (startTimeObj.time.length > 0 && (!hasStartTimeInput || !time12h.test(startPadded))) {
      setStartTimeError('Invalid 12-Hour Time (HH:MM)');
    }
    if (endTimeObj.time.length > 0 && (!hasEndTimeInput || !time12h.test(endPadded))) {
      setEndTimeError('Invalid 12-Hour Time (HH:MM)');
    }

    // If either is specified, both must be specified
    if ((hasStartTimeInput && !hasEndTimeInput) || (!hasStartTimeInput && hasEndTimeInput)) {
      if (!hasStartTimeInput) {
        setStartTimeError('Start Time is Required.');
      }
      if (!hasEndTimeInput) {
        setEndTimeError('End Time is Required.');
      }
    }

    // If both are filled and valid, check logical order
    if (
      hasStartTimeInput && hasEndTimeInput
      && time12h.test(startPadded)
      && time12h.test(endPadded)
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
        setStartTimeError('Start Time cannot be after End Time.');
        setEndTimeError('End Time cannot be before Start Time.');
      }
    }
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

  const allValid = useMemo(() => {
    // Group name must not be taken and not empty
    if (isGroupNameTaken || trimmedGroupName.length === 0) {
      return false;
    }
    // At least one keyword
    if (keywordError) {
      return false;
    }
    // If active time window is enabled, both fields must be filled and valid (empty is invalid)
    if (useActiveTimeWindow) {
      const startFilled = startTimeObj.time && (startTimeObj.time.length === 3 || startTimeObj.time.length === 4);
      const endFilled = endTimeObj.time && (endTimeObj.time.length === 3 || endTimeObj.time.length === 4);
      // Both must be filled
      if (!startFilled || !endFilled) {
        return false;
      }
      // Both must be valid
      if (startTimeError || endTimeError) {
        return false;
      }
    }
    return true;
  }, [isGroupNameTaken, trimmedGroupName.length, keywordError, useActiveTimeWindow, startTimeObj, endTimeObj, startTimeError, endTimeError]);

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
    <div className='relative h-full w-full flex flex-col items-center justify-start'>
      <h1 className='text-1xl font-bold' style={{ marginTop: 0, marginBottom: 0 }}>Create Notification Group</h1>
      <div className='w-full max-w-md self-center px-0 text-center sm:px-1 pb-20' style={{ marginTop: 0, paddingTop: 0 }}>
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
                        data-tip={isAtCapacity ? 'Limit Reached. Please edit or delete an existing Notification Group.' : undefined}
                        title={isAtCapacity ? 'Limit Reached. Please edit or delete an existing Notification Group.' : undefined}
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

            {!isGroupNameTaken && groupNameInput.trim().length > 0 && (
              <>
                {/* KeywordInput Step */}
                <div className='mt-6 flex flex-col items-center'>
                  <KeywordInput
                    value={keywords}
                    onChange={setKeywords}
                    maxLength={2000}
                    rows={4}
                    keywordLimit={guilds.find((g) => g.guildId === selectedGuildId)?.maxKeywordsPerNotificationGroup ?? null}
                    keywordCount={keywordCount}
                    errorText={keywordError}
                  />
                </div>
                {/* Active Time Window Step (with card) */}
                <div className='mt-6 flex flex-col items-center w-full'>
                  <div className='w-full max-w-xs rounded-box border border-base-300 bg-base-200 shadow-sm p-3'>
                    <label className='flex items-center gap-2 cursor-pointer mb-4'>
                      <input
                        type='checkbox'
                        className='toggle toggle-primary'
                        checked={useActiveTimeWindow}
                        onChange={() => setUseActiveTimeWindow((v) => !v)}
                      />
                      <span className='text-[0.85rem] font-medium'>Active Time Window</span>
                    </label>
                    <div className='flex flex-col items-center w-full'>
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
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* Create Button absolutely anchored at bottom */}
      <div className='absolute bottom-0 left-0 w-full flex justify-center pb-4'>
        <button
          type='button'
          className='btn btn-primary btn-sm w-28 rounded-lg shadow text-base font-semibold'
          style={{ minWidth: '6rem' }}
          disabled={!allValid}
        >
          Create
        </button>
      </div>
    </div>
  );
}
