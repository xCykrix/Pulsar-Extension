import { type MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import { AccessCache } from './logic/AccessCache.ts';
import { UserPingerGroup } from './logic/UserPingerGroup.ts';
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
  const pollStatus = async (): Promise<void> => {
    browser.runtime.sendMessage(
      await MessagingService.fdispatch(MessageType.POST_STATUS, async () => {
        const { sessionToken } = await browser.storage.local.get('sessionToken') as { sessionToken?: string };
        const statusEndpoint = getEndpoint('/notification/status');
        console.debug(`${BACKGROUND_FCM_LOG_PREFIX} Running Status Check.`);

        if (!sessionToken) {
          return { status: 'PENDING' as const };
        }

        const signal = AbortSignal.timeout(1000);
        const response = await fetch(statusEndpoint, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
          signal,
        }).catch(() => null);

        if (response?.ok && response.status === 200) {
          return { status: 'OK' as const };
        }
        else if (response?.ok && response.status === 401) {
          return { status: 'PENDING' as const };
        }
        else {
          return { status: 'ERROR' as const };
        }
      }),
    ).catch((e) => console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Dispatch Status Message.`, e));
  };
  setInterval(pollStatus, 5000);

  // Polling: AccessCache Update in Background and Transmit to UI. Updated 10s Interval.
  const pollAccessCache = async (): Promise<void> => {
    browser.runtime.sendMessage(
      await MessagingService.fdispatch(MessageType.POST_ACCESS_CACHE, async () => {
        const getLatestData = await AccessCache.getLatestData().catch((err) => {
          console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Load AccessCache getLatestData().`, err);
          throw new Error('Failed to Load AccessCache getLatestData().');
        });
        return getLatestData;
      }),
    ).catch((e) => console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Dispatch AccessCache Message.`, e));
  };
  setInterval(pollAccessCache, 10000);

  // Polling: UserPingerGroups Update in Background and Transmit to UI. Updated 10s Interval.
  const pollUserPingerGroups = async (): Promise<void> => {
    browser.runtime.sendMessage(
      await MessagingService.fdispatch(MessageType.POST_USER_PINGER_GROUPS, async () => {
        const userPingerGroups = await UserPingerGroup.get().catch((err) => {
          console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Load UserPingerGroups.`, err);
          throw new Error('Failed to Load UserPingerGroups.');
        });
        return userPingerGroups;
      }),
    ).catch((e) => console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to Dispatch UserPingerGroups Message.`, e));
  };
  setInterval(pollUserPingerGroups, 10000);

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null && 'upstart' in message) {
      pollAccessCache(); // Initial Immediate Poll
      pollUserPingerGroups(); // Initial Immediate Poll
    }
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
