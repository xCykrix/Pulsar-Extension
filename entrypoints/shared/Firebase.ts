import { type FirebaseApp, initializeApp } from 'firebase/app';
import { getToken, type Messaging, isSupported } from 'firebase/messaging';
import { getMessaging as getMessagingSW, isSupported as isSupportedSW, type Messaging as MessagingSW } from 'firebase/messaging/sw';
import { fetchAndActivate, getRemoteConfig, getValue, isSupported as isRemoteConfigSupported, type RemoteConfig } from 'firebase/remote-config';
import { browser } from 'wxt/browser';
import { FIREBASE, getEndpoint } from './Constants.ts';

export class Firebase {
  private static instance: FirebaseApp | null = null;
  private static messaging: Messaging | null = null;
  private static messagingsw: MessagingSW | null = null;
  private static rc: RemoteConfig | null = null;

  private static initialize(): void {
    if (this.instance !== null) {
      return;
    }

    const app = initializeApp(FIREBASE);
    this.instance = app;
  }

  // deno-lint-ignore require-await
  public static async getFirebaseMessagingBackground(): Promise<Messaging> {
    // Ensure App
    this.initialize();

    // Ensure Supported
    if (!isSupportedSW()) {
      throw new Error('Firebase messaging is not supported in this browser context.');
    }

    // Bind Messaging
    if (this.messaging === null) {
      this.messaging = getMessagingSW(this.instance!);
    }

    return this.messaging!;
  }

  // deno-lint-ignore require-await
  public static async getFirebaseMessagingFrontend(): Promise<MessagingSW> {
    // Ensure App
    this.initialize();

    // Ensure Supported
    if (!isSupported()) {
      throw new Error('Firebase messaging is not supported in this browser context.');
    }

    // Bind Messaging
    if (this.messagingsw === null) {
      this.messagingsw = getMessagingSW(this.instance!);
    }

    return this.messagingsw!;
  }

  public static async getAndRegisterNextFCMToken(): Promise<string | null> {
    // Ensure App and Messaging
    await this.getFirebaseMessagingFrontend();

    // Get Session Token and FCM Token
    const { sessionToken } = await browser.storage.local.get('sessionToken') as { sessionToken?: string };
    const { fcmToken } = await browser.storage.local.get('fcmToken') as { fcmToken?: string };

    if (sessionToken === undefined || sessionToken.trim().length === 0) {
      console.warn('[Pulsar][Firebase] Session Token required for FCM Registration. Skipping Device Registration until Authenticated.');
      throw new Error('Session Token is required for FCM Registration.');
    }

    // Fetch Token
    const token = await getToken(
      this.messagingsw!,
      {
        vapidKey: FIREBASE.vapidKey,
        serviceWorkerRegistration: await this.getExtensionServiceWorkerRegistration(),
      },
    ).catch((err) => {
      console.error('[Pulsar][Firebase] Failed to get FCM Token.', err);
      return null;
    });

    // Validate Token
    if (token === null || token.trim().length === 0) {
      console.error('[Pulsar][Firebase] Invalid FCM Token Response for getToken():', token);
      throw new Error('Firebase getToken returned an Invalid Response.');
    }

    // Quick Respond on Identical Token
    if (fcmToken === token) {
      return token;
    }

    // Cache New Token
    await browser.storage.local.set({ fcmToken: token });

    // Register Token
    const form = new FormData();
    form.append('fcmToken', token);

    const response = await fetch(`${getEndpoint('/notification/register')}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      body: form,
    });

    if (!response.ok) {
      console.error('[Pulsar][Firebase] Failed to register FCM token with server.', response.status, response.statusText);
      throw new Error('Failed to Register Firebase token with Pulsar Server.');
    }

    return token;
  }

  public static async getRemoteValue(id: string, fallback: string | null = null): Promise<string | null> {
    // Ensure App
    this.initialize();

    // Validate Support
    if (typeof window === 'undefined') {
      throw new Error('Remote Config is only supported in a browser context.');
    }
    if (!(await isRemoteConfigSupported().catch(() => false))) {
      throw new Error('Remote Config is not supported in this browser.');
    }

    // Bind Remote Config
    if (this.rc === null) {
      this.rc = getRemoteConfig(this.instance!);
      this.rc.settings = {
        fetchTimeoutMillis: 10000,
        minimumFetchIntervalMillis: 60000,
      };
    }

    // Fetch and Activate
    await fetchAndActivate(this.rc).catch((error) => {
      console.warn('[Pulsar][Firebase] Failed to fetchAndActivate remoteConfig.', error);
    });

    return getValue(this.rc, id?.trim()).asString() ?? fallback;
  }

  private static async getExtensionServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service worker API is unavailable in this context.');
    }
    return await navigator.serviceWorker.ready;
  }
}
