import { type MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import { AccessCache } from './shared/accessCache.ts';
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
  void AccessCache.getLatestData().then((v) => {
    if (v.lastUpdateSuccessful) {
      console.info(`${BACKGROUND_FCM_LOG_PREFIX} Synced Pulsar AccessCache getLatestData().`, v);
    }
    else {
      console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Load AccessCache getLatestData() but maintained stale structure.`, v);
    }
  }).catch((err) => {
    console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Load AccessCache getLatestData() due to thrown error.`, err);
  });

  browser.runtime.onMessage.addListener(async (message: unknown, _sender, sendResponse) => {
    // OP: GET_ACCESS_CACHE. Side Panel Data Requester.
    if (typeof message === 'object' && message !== null && (message as Record<string, unknown>).type === 'GET_ACCESS_CACHE') {
      const getLatestData = await AccessCache.getLatestData();
      console.info(`${BACKGROUND_FCM_LOG_PREFIX} GET_ACCESS_CACHE requested from sidepanel.`, getLatestData);
      void sendResponse({
        guildsById: getLatestData.guildsById,
        channelsByGuild: getLatestData.channelsByGuild,
        categoriesByGuild: getLatestData.categoriesByGuild,
      });
      return true; // async response
    }

    // Fallback to FCM Messenges.
    if (!isForegroundNotificationMessage(message)) {
      return false;
    }
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received Foreground Message Proxied.`, message);

    // Process FCM Message to Relay Proxies.
    const title = message.notification?.title ?? 'Pulsar Notification';
    const body = message.notification?.body ?? 'You have a new message.';
    const sentAtMs = getSentAtMs(message.data);
    void dispatchFCMToSidepanel(title, body, sentAtMs);
    void dispatchFCMToNotification(title, body);
    return false;
  });
});

async function initializeFirebaseMessaging(): Promise<void> {
  const messaging = await Firebase.getFirebaseMessagingServiceWorker();

  onBackgroundMessage(messaging, (payload: MessagePayload) => {
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received Background Message Proxied.`, payload);

    const title = payload.notification?.title ?? payload.data?.title ?? 'Pulsar Notification';
    const body = payload.notification?.body ?? payload.data?.body ?? 'You have a new message.';
    const sentAtMs = getSentAtMs(payload.data);
    void dispatchFCMToSidepanel(title, body, sentAtMs);
    void dispatchFCMToNotification(title, body);
  });
}

async function dispatchFCMToSidepanel(title: string, body: string, sentAtMs?: number): Promise<void> {
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

async function dispatchFCMToNotification(title: string, message: string): Promise<void> {
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
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}
