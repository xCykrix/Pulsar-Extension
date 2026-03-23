const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export function getApiBase(): string {
  return env.WXT_INTERNAL_API ?? 'http://localhost:9000';
}
