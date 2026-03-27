// // access-cache.ts
// // Background task to fetch and index access data from WXT_INTERNAL_API/ui/getAccess

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

export type GuildsById = Record<string, UserAccess>;
export type CategoriesByGuild = Record<string, GuildCategory[]>;
export type ChannelsByGuild = Record<string, Record<string, ChannelAccess>>;

export class AccessCache {
  public static guilds: GuildsById = {};
  public static categories: CategoriesByGuild = {};
  public static channels: ChannelsByGuild = {};
  public static lastUpdateSuccessful = false;

  private static lastUpdatedAt: Date | null = null;

  public static async refresh(): Promise<void> {
    const { sessionToken } = await browser.storage.local.get('sessionToken') as { sessionToken?: string };

    if (!sessionToken) {
      console.warn('[AccessCache] No session token found, skipping access cache refresh.');
      this.lastUpdateSuccessful = false;
      return;
    }

    const response = await fetch(getEndpoint('/ui/getAccess'), {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[AccessCache] Failed to fetch /ui/getAccess: ${response.status} ${response.statusText}`);
      this.lastUpdateSuccessful = false;
      return;
    }

    const json: GetAccessResponse = await response.json().catch((err) => {
      console.error('[AccessCache] Failed to parse /ui/getAccess response as JSON.', err);
      this.lastUpdateSuccessful = false;
      return { userAccess: [], channelAccess: [], categoriesByGuild: {} };
    });
    console.info('[AccessCache] Parsing /ui/getAccess Data', json);

    const diguilds: GuildsById = {};
    const dicategories: CategoriesByGuild = {};
    const dichannels: ChannelsByGuild = {};

    // Map UserAccess by guildId
    for (const ua of json.userAccess ?? []) {
      diguilds[ua.guildId] = ua;
    }

    // Map categories by guildId
    for (const [guildId, cats] of Object.entries(json.categoriesByGuild ?? {})) {
      dicategories[guildId] = cats;
    }

    // Map ChannelAccess by guildId and channelId
    for (const ca of json.channelAccess ?? []) {
      if (!dichannels[ca.guildId]) {
        dichannels[ca.guildId] = {};
      }
      dichannels[ca.guildId][ca.channelId] = ca;
    }
    console.info(diguilds, dicategories, dichannels);

    // Atomically replace old cache with new cache
    this.guilds = diguilds;
    this.categories = dicategories;
    this.channels = dichannels;
    this.lastUpdateSuccessful = true;
    this.lastUpdatedAt = new Date();
  }

  public static async getLatestData(): Promise<{
    guildsById: GuildsById;
    channelsByGuild: ChannelsByGuild;
    categoriesByGuild: CategoriesByGuild;
    lastUpdatedAt: Date | null;
    lastUpdateSuccessful: boolean;
  }> {
    await this.refresh();

    return {
      guildsById: this.guilds,
      channelsByGuild: this.channels,
      categoriesByGuild: this.categories,
      lastUpdatedAt: this.lastUpdatedAt,
      lastUpdateSuccessful: this.lastUpdateSuccessful,
    };
  }
}
