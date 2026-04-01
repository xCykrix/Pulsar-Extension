/** @jsxImportSource react */

import { ReactElement } from 'react';
import { UserPinger } from '../../../logic/UserPingerGroup.ts';

interface EditGroupDisplayProps {
  group: UserPinger;
}

export function EditGroupDisplay({ group }: EditGroupDisplayProps): ReactElement {
  return (
    <div className='flex flex-col items-center justify-center h-full'>
      <h1 className='text-2xl font-bold'>(... Edit User Group ...)</h1>
      <p className='mt-2 text-sm opacity-60'>Edit User Group Panel: {group.name}</p>
    </div>
  );
}
