import { browser } from 'wxt/browser';
import { getEndpoint } from '../shared/Constants.ts';

export interface UserPinger {
  ulid: string;
  discordUserId: string;
  guildId: string;
  name: string;
  activeTimeStart: `${number}:${number} ${'AM' | 'PM'}` | null;
  activeTimeEnd: `${number}:${number} ${'AM' | 'PM'}` | null;
  keywords: string;
  channels: UserPingerGroupChannelMap[];
  createdAt: Date;
}

export interface UserPingerGroupChannelMap {
  ulid: string;
  parentUserPinger: string;
  channelId: string;
  createdAt: Date;
}

interface CreateUserPingerResponse {
  success: boolean;
  guildId: string;
  groupName: string;
}

export class UserPingerGroup {
  public static async inflight(packet: unknown): Promise<boolean> {
  }

  public static async create(packet: unknown): Promise<CreateUserPingerResponse> {
  }

  public static async get(): Promise<UserPinger[]> {
    const { sessionToken } = await browser.storage.local.get('sessionToken') as { sessionToken?: string };

    if (!sessionToken) {
      console.warn('[AccessCache][refresh] User is not authenticated. Refresh of AccessCache aborted.');
      return [];
    }

    const signal = AbortSignal.timeout(10000);
    const response = await fetch(getEndpoint('/ui/getUserGroups'), {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      signal,
    });

    if (!response.ok) {
      console.error(`[UserPingerGroup][get] Failed to UserPinger.get(). Status: ${response.status}`);
      throw new Error(`Unable to fetch UserPingerGroups. API returned failure. Status: ${response.status}`);
    }

    try {
      return (await response.json()).groups as UserPinger[];
    }
    catch {
      throw new Error('Unable to fetch UserPingerGroups. API returned invalid JSON response.');
    }
  }
}
