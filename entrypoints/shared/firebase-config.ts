interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const FIREBASE_MESSAGING_ENV_MAP = {
  apiKey: 'WXT_FIREBASE_API_KEY',
  authDomain: 'WXT_FIREBASE_AUTH_DOMAIN',
  projectId: 'WXT_FIREBASE_PROJECT_ID',
  storageBucket: 'WXT_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'WXT_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'WXT_FIREBASE_APP_ID',
  vapidKey: 'WXT_FIREBASE_VAPID_KEY',
} as const;

type FirebaseMessagingEnvKey = keyof typeof FIREBASE_MESSAGING_ENV_MAP;

interface FirebaseMessagingDiagnostics {
  hasConfig: boolean;
  missingKeys: string[];
}

export function getFirebaseWebConfig(): FirebaseWebConfig {
  return {
    apiKey: env.WXT_FIREBASE_API_KEY ?? '',
    authDomain: env.WXT_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.WXT_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.WXT_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: env.WXT_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.WXT_FIREBASE_APP_ID ?? '',
  };
}

export function getFirebaseVapidKey(): string {
  return env.WXT_FIREBASE_VAPID_KEY ?? '';
}

export function getNotificationRegisterPath(): string {
  return env.WXT_NOTIFICATION_REGISTER_PATH ?? '/notifications/register';
}

export function getNotificationVerifyPath(): string {
  return env.WXT_NOTIFICATION_VERIFY_PATH ?? '/notifications/verify';
}

export function hasFirebaseMessagingConfig(): boolean {
  return getFirebaseMessagingDiagnostics().hasConfig;
}

export function getFirebaseMessagingDiagnostics(): FirebaseMessagingDiagnostics {
  const firebaseConfig = getFirebaseWebConfig();
  const configValues: Record<FirebaseMessagingEnvKey, string> = {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
    vapidKey: getFirebaseVapidKey(),
  };
  const missingKeys = (Object.entries(configValues) as Array<[FirebaseMessagingEnvKey, string]>)
    .filter(([, value]: [FirebaseMessagingEnvKey, string]) => value.trim().length === 0)
    .map(([key]: [FirebaseMessagingEnvKey, string]) => FIREBASE_MESSAGING_ENV_MAP[key]);

  return {
    hasConfig: missingKeys.length === 0,
    missingKeys,
  };
}
