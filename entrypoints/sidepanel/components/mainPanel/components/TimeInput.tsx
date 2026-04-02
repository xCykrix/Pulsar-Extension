import { type ReactElement, useEffect, useState } from 'react';

interface TimeInputValue {
  time: string;
  meridiem: 'AM' | 'PM';
}

interface TimeInputProps {
  label: string;
  value?: TimeInputValue;
  onChange?: (val: TimeInputValue) => void;
  disabled?: boolean;
  error?: string;
}

export function TimeInput({ label, value, onChange, disabled, error }: TimeInputProps): ReactElement {
  const [localTime, setLocalTime] = useState(value?.time ?? '');
  const [localMeridiem, setLocalMeridiem] = useState<'AM' | 'PM'>(value?.meridiem ?? 'AM');

  // Sync with parent value
  useEffect(() => {
    if (value) {
      setLocalTime(value.time);
      setLocalMeridiem(value.meridiem);
    }
  }, [value?.time, value?.meridiem]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 4) {
      val = val.slice(0, 4);
    }
    setLocalTime(val);
    onChange?.({ time: val, meridiem: localMeridiem });
  };

  const handleMeridiemChange = (mer: 'AM' | 'PM') => {
    setLocalMeridiem(mer);
    onChange?.({ time: localTime, meridiem: mer });
  };

  return (
    <div className='flex flex-col items-center'>
      <label className='mb-1 text-xs font-semibold text-base-content/70'>{label}</label>
      <div className='flex items-center gap-1 w-full relative'>
        <div className='relative flex-grow min-w-0'>
          <input
            type='text'
            className='input input-bordered w-full text-xs h-10 p-1 pr-14 tracking-widest text-transparent caret-base-content'
            placeholder='hhmm'
            value={localTime}
            onChange={handleInputChange}
            disabled={disabled}
            maxLength={4}
            style={{
              letterSpacing: '0.15em',
              WebkitTextFillColor: 'transparent',
              textAlign: 'left',
              paddingLeft: '33%',
              caretColor: 'var(--fallback-bc, #181A2A)',
            }}
          />
          {/* Overlay formatted time with phantom colon */}
          <span
            className='pointer-events-none absolute top-1/2 -translate-y-1/2 w-full flex justify-start text-xs tracking-widest text-base-content select-none'
            style={{
              zIndex: 2,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
              left: '33%',
            }}
          >
            {(() => {
              if (!localTime) {
                return '';
              }
              if (localTime.length <= 2) {
                return localTime;
              }
              // If 3 digits, pad left with 0 for display
              const padded = localTime.length === 3 ? `0${localTime}` : localTime;
              // Show 8:00 for 800, 08:00 for 0800
              if (padded[0] === '0') {
                return `${padded[1]}:${padded.slice(2, 4)}`;
              }
              return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
            })()}
          </span>
        </div>
        {/* AM/PM toggle inside input */}
        <div className='absolute right-2 top-1/2 -translate-y-1/2 flex flex-col rounded-md overflow-hidden border border-base-300 shadow-sm bg-base-100' style={{ height: '2.2rem', minWidth: '2.2rem' }}>
          <button
            type='button'
            className={`px-2 py-0.5 text-xs font-semibold focus:outline-none transition-colors duration-100 ${localMeridiem === 'AM' ? 'bg-primary text-primary-content' : 'bg-transparent text-base-content/70'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{ height: '50%' }}
            onClick={() => !disabled && handleMeridiemChange('AM')}
            disabled={disabled}
          >
            AM
          </button>
          <button
            type='button'
            className={`px-2 py-0.5 text-xs font-semibold focus:outline-none transition-colors duration-100 ${localMeridiem === 'PM' ? 'bg-primary text-primary-content' : 'bg-transparent text-base-content/70'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{ height: '50%' }}
            onClick={() => !disabled && handleMeridiemChange('PM')}
            disabled={disabled}
          >
            PM
          </button>
        </div>
      </div>
      <div className='mt-1 w-full text-left pl-2' style={{ minHeight: '1.5em', display: 'flex', alignItems: 'flex-start' }}>
        <span className='text-error text-xs' style={{ visibility: error ? 'visible' : 'hidden', height: '1.5em', display: 'inline-block' }}>{error || ' '}</span>
      </div>
    </div>
  );
}
