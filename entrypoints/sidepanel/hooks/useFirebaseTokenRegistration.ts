import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import { getApiBase } from '../../shared/api-config.ts';
import { getFirebaseVapidKey, getFirebaseWebConfig, getNotificationRegisterPath, hasFirebaseMessagingConfig } from '../../shared/firebase-config.ts';

interface UseFirebaseTokenRegistration {
  isRegistering: boolean;
  registrationError: string | null;
}

const FIREBASE_TOKEN_STORAGE_KEY = 'fcmToken';
const TOKEN_REVALIDATION_INTERVAL_MS = 60000;

export function useFirebaseTokenRegistration(sessionToken: string | null): UseFirebaseTokenRegistration {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToken === null || sessionToken.trim().length === 0) {
      return;
    }

    let cancelled = false;
    let isRegisteringInFlight = false;

    const run = async (): Promise<void> => {
      if (isRegisteringInFlight) {
        return;
      }
      isRegisteringInFlight = true;

      if (!hasFirebaseMessagingConfig()) {
        if (!cancelled) {
          setRegistrationError('Firebase messaging is not configured.');
        }
        isRegisteringInFlight = false;
        return;
      }

      const supported = await isSupported();
      if (!supported) {
        if (!cancelled) {
          setRegistrationError('Firebase messaging is not supported in this browser context.');
        }
        isRegisteringInFlight = false;
        return;
      }

      if (!cancelled) {
        setIsRegistering(true);
        setRegistrationError(null);
      }

      try {
        const cachedResult = await browser.storage.local.get([FIREBASE_TOKEN_STORAGE_KEY]);
        const cachedToken = (cachedResult as { fcmToken?: string }).fcmToken ?? null;

        const app = getApps()[0] ?? initializeApp(getFirebaseWebConfig());
        const messaging = getMessaging(app);
        const serviceWorkerRegistration = await getExtensionServiceWorkerRegistration();

        const token = await getToken(messaging, {
          vapidKey: getFirebaseVapidKey(),
          serviceWorkerRegistration,
        });

        if (token.trim().length === 0) {
          throw new Error('Firebase returned an empty token.');
        }

        await browser.storage.local.set({ [FIREBASE_TOKEN_STORAGE_KEY]: token });

        if (cachedToken === token) {
          return;
        }

        const registrationOk = await registerToken(token, sessionToken);
        if (!registrationOk) {
          throw new Error('Failed to register Firebase token.');
        }
      }
      catch (error) {
        console.error('[Pulsar] Firebase token registration failed:', error);
        if (!cancelled) {
          setRegistrationError('Could not register push notifications.');
        }
      }
      finally {
        if (!cancelled) {
          setIsRegistering(false);
        }
        isRegisteringInFlight = false;
      }
    };

    void run();
    const intervalId = setInterval(() => {
      void run();
    }, TOKEN_REVALIDATION_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionToken]);

  return { isRegistering, registrationError };
}

async function registerToken(token: string, sessionToken: string): Promise<boolean> {
  if (token.trim().length === 0) {
    return false;
  }

  const formData = new FormData();
  formData.append('fcmToken', token);

  const response = await fetch(`${getApiBase()}${getNotificationRegisterPath()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    body: formData,
  });

  console.info(`[Pulsar] Firebase token registration response: ${response.status}`, response.statusText);
  return response.ok;
}

async function getExtensionServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker API is unavailable in this context.');
  }
  return await navigator.serviceWorker.ready;
}
