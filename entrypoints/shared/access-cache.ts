// access-cache.ts
// Background task to fetch and index access data from WXT_INTERNAL_API/ui/getAccess

import { browser } from 'wxt/browser';
import { getEndpoint } from './const.ts';

export interface UserAccess {
  discordUserId: string;
  guildId: string;
  guildName: string;
  priorityLevel: number;
  maxNotificationGroup: number;
  maxChannelsPerNotificationGroup: number;
  maxKeywordsPerNotificationGroup: number;
  extendedExperimentalFeatures: boolean;
  createdAt: string;
}

export interface ChannelAccess {
  discordUserId: string;
  guildId: string;
  channelId: string;
  channelName: string;
  createdAt: string;
  parentCategory: string;
}

export interface GuildCategory {
  ulid: string;
  guildId: string;
  categoryName: string;
  categoryType: string;
  weight: number;
  createdAt: string;
}

export interface GetAccessResponse {
  userAccess: UserAccess[];
  channelAccess: ChannelAccess[];
  categoriesByGuild: Record<string, GuildCategory[]>;
}

// Indexed Caching
const guildsById = new Map<string, UserAccess>();
const channelsByGuild = new Map<string, Map<string, ChannelAccess>>();
const categoriesByGuild = new Map<string, Set<GuildCategory>>();

let lastUpdatedAt: string | null = null;
let lastError: string | null = null;

export async function refreshAccessCache(): Promise<void> {
  console.info('[access-cache] refreshAccessCache called');
  try {
    const storageResult = await browser.storage.local.get('sessionToken') as { sessionToken?: string };
    const sessionToken = storageResult.sessionToken;
    const headers: Record<string, string> = {};
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    console.info('[access-cache] Fetching accessCache.');
    const resp = await fetch(`${getEndpoint('/ui/getAccess')}`, { headers });
    if (!resp.ok) {
      console.error('[access-cache] Fetch failed:', resp.status, resp.statusText);
      throw new Error(`HTTP ${resp.status}`);
    }
    const data: GetAccessResponse = await resp.json();
    console.info('[access-cache] Raw API response:', data);

    // Clear old data
    guildsById.clear();
    channelsByGuild.clear();
    categoriesByGuild.clear();

    // Index userAccess
    for (const ua of data.userAccess || []) {
      guildsById.set(ua.guildId, ua);
    }

    // Index channelAccess
    for (const ca of data.channelAccess || []) {
      if (!channelsByGuild.has(ca.guildId)) {
        channelsByGuild.set(ca.guildId, new Map());
      }
      channelsByGuild.get(ca.guildId)!.set(ca.channelId, ca);
    }

    // Index categoriesByGuild
    for (const [guildId, cats] of Object.entries(data.categoriesByGuild || {})) {
      categoriesByGuild.set(guildId, new Set(cats));
    }

    lastUpdatedAt = new Date().toISOString();
    lastError = null;
    console.info('[access-cache] refreshAccessCache completed');
  }
  catch (err: unknown) {
    console.error('[access-cache] Error in refreshAccessCache:', err);
    lastError = err instanceof Error ? err.message : String(err);
  }
}

export function getAccessCache(): {
  guildsById: Map<string, UserAccess>;
  channelsByGuild: Map<string, Map<string, ChannelAccess>>;
  categoriesByGuild: Map<string, Set<GuildCategory>>;
  lastUpdatedAt: string | null;
  lastError: string | null;
} {
  return {
    guildsById,
    channelsByGuild,
    categoriesByGuild,
    lastUpdatedAt,
    lastError,
  };
}

export function getGuildOptions(): Array<{ guildId: string; guildName: string }> {
  // For dropdowns: [{ guildId, guildName }]
  return Array.from(guildsById.values()).map(({ guildId, guildName }) => ({ guildId, guildName }));
}
