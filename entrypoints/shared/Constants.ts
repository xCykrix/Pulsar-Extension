const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

// API Path Helpers
export const BASE_API = env.WXT_INTERNAL_API ?? 'http://localhost:9000';
export function getEndpoint(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_API}${normalizedPath}`;
}

// OAuth
export const OAUTH_POLL_MS = 1000;
export const OAUTH_POLL_TTL = 120000;
export const OAUTH_POLL_FAIL_COUNT = 3;

// Firebase
export const FIREBASE = {
  apiKey: env.WXT_FIREBASE_API_KEY ?? '',
  authDomain: env.WXT_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.WXT_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.WXT_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.WXT_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.WXT_FIREBASE_APP_ID ?? '',
  vapidKey: env.WXT_FIREBASE_VAPID_KEY ?? '',
} as const;
export const FCM_REGISTER_POLL_RATE = 120000;
