/** @jsxImportSource react */

import { type ReactElement, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

interface SidepanelMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup?: () => void;
}

interface GuildOption {
  guildId: string;
  guildName: string;
}

export function SidepanelMenu({ isOpen, onClose, onCreateGroup }: SidepanelMenuProps): ReactElement {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [guildOptions, setGuildOptions] = useState<GuildOption[]>([]);

  useEffect(() => {
    if (!showCreateGroupModal) {
      return;
    }

    browser.runtime.sendMessage({ type: 'GET_GUILD_OPTIONS' }).then((resp) => {
      if (resp && Array.isArray(resp.guildOptions)) {
        setGuildOptions(resp.guildOptions as GuildOption[]);
      }
      else {
        setGuildOptions([]);
      }
    });
  }, [showCreateGroupModal]);

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
          <h3 className='mb-4 text-lg font-bold'>Create Group</h3>
          <label className='form-control mb-4 w-full'>
            <span className='label-text mb-1'>Select Guild</span>
            <select
              className='select select-bordered w-full'
              value={selectedGuildId}
              onChange={(event) => {
                setSelectedGuildId(event.target.value);
              }}
            >
              <option value='' disabled>Select a guild...</option>
              {guildOptions.map((guild) => <option key={guild.guildId} value={guild.guildId}>{guild.guildName}</option>)}
            </select>
          </label>
          <div className='flex justify-end gap-2'>
            <button className='btn btn-ghost' type='button' onClick={() => setShowCreateGroupModal(false)}>Cancel</button>
            <button className='btn btn-primary' type='button' disabled={!selectedGuildId} onClick={() => setShowCreateGroupModal(false)}>Continue</button>
          </div>
        </div>
        <label className='modal-backdrop' onClick={() => setShowCreateGroupModal(false)} />
      </div>
    </>
  );
}
