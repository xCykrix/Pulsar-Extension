import { type MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import { getGuildOptions, refreshAccessCache } from './shared/access-cache.ts';
import { Firebase } from './shared/firebase.ts';

const FALLBACK_NOTIFICATION_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7f7p4AAAAASUVORK5CYII=';
const BACKGROUND_FCM_LOG_PREFIX = '[Pulsar FCM][background]';

interface ForegroundNotificationMessage {
  type: 'PULSAR/FCM_FOREGROUND_MESSAGE';
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
}

interface SidepanelNotificationMessage {
  type: 'PULSAR/FCM_SIDEPANEL_MESSAGE';
  notification: {
    title: string;
    body: string;
  };
  sentAtMs?: number;
  receivedAtMs: number;
}

export default defineBackground(() => {
  console.info(`${BACKGROUND_FCM_LOG_PREFIX} Background service worker started.`);

  void browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });

  void initializeFirebaseMessaging().catch((error: unknown) => {
    console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to initialize Firebase Messaging.`, error);
  });

  // Fetch and index access data on startup
  void refreshAccessCache().then(() => {
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Access cache fetched on startup.`, getGuildOptions());
  }).catch((error: unknown) => {
    console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to fetch access data on startup.`, error);
  });

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    // Sidepanel requests guild options
    if (typeof message === 'object' && message !== null && (message as Record<string, unknown>).type === 'GET_GUILD_OPTIONS') {
      const guildOptions = getGuildOptions();
      console.info(`${BACKGROUND_FCM_LOG_PREFIX} GET_GUILD_OPTIONS requested. Returning:`, guildOptions);
      sendResponse({ guildOptions });
      return true; // async response
    }

    if (!isForegroundNotificationMessage(message)) {
      return false;
    }

    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received foreground relay message.`, message);

    const title = message.notification?.title ?? 'Pulsar Notification';
    const body = message.notification?.body ?? 'You have a new message.';
    const sentAtMs = getSentAtMs(message.data);
    void relayFcmMessageToSidepanel(title, body, sentAtMs);
    void createExtensionNotification(title, body);
    return false;
  });
});

async function initializeFirebaseMessaging(): Promise<void> {
  const messaging = await Firebase.getFirebaseMessagingServiceWorker();

  onBackgroundMessage(messaging, (payload: MessagePayload) => {
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received background payload.`, payload);

    const title = payload.notification?.title ?? payload.data?.title ?? 'Pulsar Notification';
    const body = payload.notification?.body ?? payload.data?.body ?? 'You have a new message.';
    const sentAtMs = getSentAtMs(payload.data);
    void relayFcmMessageToSidepanel(title, body, sentAtMs);
    void createExtensionNotification(title, body);
  });
}

async function relayFcmMessageToSidepanel(title: string, body: string, sentAtMs?: number): Promise<void> {
  const message: SidepanelNotificationMessage = {
    type: 'PULSAR/FCM_SIDEPANEL_MESSAGE',
    notification: { title, body },
    sentAtMs,
    receivedAtMs: Date.now(),
  };

  try {
    await browser.runtime.sendMessage(message);
  }
  catch {
    // It's possible the sidepanel isn't open, so this may fail. That's okay - the message will be delivered if/when the sidepanel opens.
  }
}

async function createExtensionNotification(title: string, message: string): Promise<void> {
  if (!browser.notifications) {
    console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Notifications API is unavailable.`, { title, message });
    return;
  }

  console.info(`${BACKGROUND_FCM_LOG_PREFIX} Creating extension notification.`, { title, message });

  await browser.notifications.create({
    type: 'basic',
    title,
    message,
    iconUrl: FALLBACK_NOTIFICATION_ICON,
  });
}

// Helper Functions. Move these? Dunno.
function isForegroundNotificationMessage(message: unknown): message is ForegroundNotificationMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  return (message as { type?: string }).type === 'PULSAR/FCM_FOREGROUND_MESSAGE';
}

function getSentAtMs(data?: Record<string, string>): number | undefined {
  if (data?.timestamp === undefined) {
    return undefined;
  }

  const parsed = Number(data.timestamp);
  console.info('parsed', parsed, Number.isFinite(parsed));
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}
