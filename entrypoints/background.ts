import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, isSupported, type MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import { getFirebaseMessagingDiagnostics, getFirebaseWebConfig } from './shared/firebase-config.ts';

const FALLBACK_NOTIFICATION_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7f7p4AAAAASUVORK5CYII=';
const BACKGROUND_FCM_LOG_PREFIX = '[Pulsar FCM][background]';

interface ForegroundNotificationMessage {
  type: 'PULSAR/FCM_FOREGROUND_MESSAGE';
  notification?: {
    title?: string;
    body?: string;
  };
}

export default defineBackground(() => {
  console.info(`${BACKGROUND_FCM_LOG_PREFIX} Background service worker started.`);

  void browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });

  void initializeFirebaseMessaging().catch((error: unknown) => {
    console.error(`${BACKGROUND_FCM_LOG_PREFIX} Failed to initialize Firebase Messaging.`, error);
  });

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isForegroundNotificationMessage(message)) {
      return false;
    }

    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received foreground relay message.`, message);

    const title = message.notification?.title ?? 'Pulsar Notification';
    const body = message.notification?.body ?? 'You have a new message.';
    void createExtensionNotification(title, body);
    return false;
  });
});

async function initializeFirebaseMessaging(): Promise<void> {
  const diagnostics = getFirebaseMessagingDiagnostics();
  if (!diagnostics.hasConfig) {
    console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Firebase Messaging config is incomplete.`, diagnostics);
    return;
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn(`${BACKGROUND_FCM_LOG_PREFIX} Firebase Messaging is not supported in the background context.`);
    return;
  }

  const firebaseApp = getApps()[0] ?? initializeApp(getFirebaseWebConfig());
  const messaging = getMessaging(firebaseApp);

  console.info(`${BACKGROUND_FCM_LOG_PREFIX} Firebase Messaging initialized. Waiting for background payloads.`);

  onBackgroundMessage(messaging, (payload: MessagePayload) => {
    console.info(`${BACKGROUND_FCM_LOG_PREFIX} Received background payload.`, payload);

    const title = payload.notification?.title ?? payload.data?.title ?? 'Pulsar Notification';
    const body = payload.notification?.body ?? payload.data?.body ?? 'You have a new message.';
    void createExtensionNotification(title, body);
  });
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

function isForegroundNotificationMessage(message: unknown): message is ForegroundNotificationMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  return (message as { type?: string }).type === 'PULSAR/FCM_FOREGROUND_MESSAGE';
}
