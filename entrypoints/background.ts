import { type MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import { AccessCache } from './shared/AccessCache.ts';
import { getEndpoint } from './shared/Constants.ts';
import { Firebase } from './shared/Firebase.ts';
import { MessageType, MessagingService } from './shared/MessagingService.ts';

const FALLBACK_NOTIFICATION_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7f7p4AAAAASUVORK5CYII=';
const BACKGROUND_FCM_LOG_PREFIX = '[Pulsar FCM][background]';

interface SidePanelNotificationMessage {
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
    MessagingService.fstack<never>(MessageType.GET_ACCESS_CACHE, message, async () => {
      const getLatestData = await AccessCache.getLatestData().catch((err) => {
        console.error(`${BACKGROUND_FCM_LOG_PREFIX} GET_ACCESS_CACHE Failed to Load AccessCache getLatestData().`, err);
        void sendResponse(null);
        return null;
      });
      void sendResponse(getLatestData);
    });
  });
});

async function initializeFirebaseMessaging(): Promise<void> {
  const messaging = await Firebase.getFirebaseMessagingBackground();

  onBackgroundMessage(messaging, (payload: MessagePayload) => {
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received Background Message Proxied.`, payload);

    const title = payload.notification?.title ?? payload.data?.title ?? 'Pulsar Notification';
    const body = payload.notification?.body ?? payload.data?.body ?? 'You have a new message.';
    const sentAtMs = getSentAtMs(payload.data);

    const message: SidePanelNotificationMessage = {
      type: 'PULSAR/FCM_SIDEPANEL_MESSAGE',
      notification: { title, body },
      sentAtMs,
      receivedAtMs: Date.now(),
    };

    void browser.runtime.sendMessage(message).catch(() => {
      // Side Panel Dispatch Failure is Non-Critical.
    });

    if (browser.notifications) {
      browser.notifications.create({
        type: 'basic',
        title,
        message: body,
        iconUrl: FALLBACK_NOTIFICATION_ICON,
      }).catch((e) => {
        console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Create Notification.`, e);
      });
    }
    else {
      console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Notifications API is Unavailable.`);
    }
  });
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
