export enum MessageType {
  STATUS_CHECK = 'PULSAR/STATUS_CHECK',
  FCM_NOTIFICATION = 'PULSAR/FCM_SIDEPANEL_MESSAGE',
}

export class MessagingService {
  private static consume(message: unknown, requiredType: MessageType): boolean {
    if (typeof message === 'object' && message !== null && 'type' in message) {
      const { type } = message as { type: string };
      if (type === requiredType) {
        return true;
      }
    }
    return false;
  }

  public static async stack<T>(type: MessageType, message: unknown, callback: (message: T) => Promise<void>): Promise<void> {
    if (this.consume(message, type)) {
      await callback(message as T).catch((error) => {
        console.error(`[MessagingService] Callback Error for: ${type}`, error);
      });
    }
  }
}
