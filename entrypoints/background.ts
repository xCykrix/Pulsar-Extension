import { type MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import { AccessCache } from './shared/cache.ts';
import { getEndpoint } from './shared/const.ts';
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
  console.info(`${BACKGROUND_FCM_LOG_PREFIX} Background Service Worker Initialized.`);
  void browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });

  // Setup Firebase
  void initializeFirebaseMessaging().catch((error: unknown) => {
    console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to initialize Firebase Messaging.`, error);
  });

  // Polling: Status Check in Background and Transmit to UI. Used to provide a physical status indication.
  setInterval(async () => {
    const { sessionToken } = await browser.storage.local.get('sessionToken') as { sessionToken?: string };
    const statusEndpoint = getEndpoint('/notification/status');
    console.debug(`${BACKGROUND_FCM_LOG_PREFIX} Running Status Check.`);

    if (!sessionToken) {
      void browser.runtime.sendMessage({
        type: 'PULSAR/STATUS_CHECK',
        status: 'PENDING',
      }).catch(() => {});
      return;
    }

    const signal = AbortSignal.timeout(1000);
    const response = await fetch(statusEndpoint, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      signal,
    }).catch(() => null);

    if (response?.ok && response.status === 200) {
      void browser.runtime.sendMessage({
        type: 'PULSAR/STATUS_CHECK',
        status: 'OK',
      }).catch(() => {});
    }
    else if (response?.ok && response.status === 401) {
      void browser.runtime.sendMessage({
        type: 'PULSAR/STATUS_CHECK',
        status: 'PENDING',
      }).catch(() => {});
    }
    else {
      void browser.runtime.sendMessage({
        type: 'PULSAR/STATUS_CHECK',
        status: 'ERROR',
      }).catch(() => {});
    }
  }, 1000);

  // Listen for Foreground Messages to Service Worker.
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    // OP: GET_ACCESS_CACHE. Side Panel Data Requester.
    if (typeof message === 'object' && message !== null && (message as Record<string, unknown>).type === 'GET_ACCESS_CACHE') {
      (async () => {
        const getLatestData = await AccessCache.getLatestData();
        console.info(`${BACKGROUND_FCM_LOG_PREFIX} GET_ACCESS_CACHE requested from sidepanel.`, getLatestData);
        void sendResponse(getLatestData);
      })().catch((err) => {
        console.error(`${BACKGROUND_FCM_LOG_PREFIX} GET_ACCESS_CACHE Failed to Load AccessCache getLatestData().`, err);
      });
      return true;
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
