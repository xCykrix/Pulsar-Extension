export enum MessageType {
  // FCM_FOREGRUND_MESSAGE = 'PULSAR/FCM_FOREGROUND_MESSAGE',
  FCM_NOTIFICATION = 'PULSAR/FCM_SIDEPANEL_MESSAGE',

  POST_STATUS = 'PULSAR/POST_STATUS',
  POST_ACCESS_CACHE = 'PULSAR/POST_ACCESS_CACHE',
  POST_USER_PINGER_GROUPS = 'PULSAR/POST_USER_PINGER_GROUPS',
}

interface InternalMessage {
  packet: unknown;
  type: MessageType;
}

export class MessagingService {
  private static consume(message: unknown, requiredType: MessageType): boolean {
    console.info('consume', message, requiredType);
    if (typeof message === 'object' && message !== null && 'packet' in message && 'type' in message) {
      const { type } = message as { type: string };
      if (type === requiredType) {
        return true;
      }
    }
    return false;
  }

  public static async fstack<T>(type: MessageType, message: unknown, callback: (message: T) => Promise<void>): Promise<void> {
    if (this.consume(message, type)) {
      await callback((message as InternalMessage).packet as T).catch((error) => {
        console.error(`[MessagingService] Callback Error for: ${type}`, error);
      });
    }
  }

  public static async fdispatch<T>(type: MessageType, build: () => Promise<T>): Promise<T | null> {
    const message = await build().catch((error) => {
      console.error(`[MessagingService] Message Build Error for: ${type}`, error);
      return null;
    });
    if (message === null) {
      console.warn(`[MessagingService] Built Message Invalid for: ${type}`);
      return null;
    }

    const messageWithType = { packet: message, type };
    console.info('mwt', messageWithType);
    return messageWithType as T;
  }
}
