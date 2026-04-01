/** @jsxImportSource react */

import { ReactElement } from 'react';
import { UserPinger } from '../../../logic/UserPingerGroup.ts';

interface BreakdownUserGroupDisplayProps {
  group: UserPinger;
}

export function BreakdownUserGroupDisplay({ group }: BreakdownUserGroupDisplayProps): ReactElement {
  return (
    <div className='flex flex-col items-center justify-center h-full'>
      <h1 className='text-2xl font-bold'>(... User Group ...)</h1>
      <p className='mt-2 text-sm opacity-60'>Breakdown User Group Panel: {group.name}</p>
    </div>
  );
}
