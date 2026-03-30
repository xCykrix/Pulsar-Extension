import { useEffect, useState } from 'react';

import { FCM_REGISTER_POLL_RATE } from '../../Constants.ts';
import { Firebase } from '../../shared/Firebase.ts';
import type { UseAuthentication } from './useAuthentication.ts';

interface UseFirebaseTokenRegistration {
  isRegistering: boolean;
  registrationError: string | null;
}

export function useFirebaseTokenRegistration({ useAuthentication }: {
  useAuthentication: UseAuthentication;
}): UseFirebaseTokenRegistration {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  useEffect(() => {
    if (useAuthentication.sessionToken === null || useAuthentication.sessionToken.trim().length === 0) {
      return;
    }

    const run = async (): Promise<void> => {
      if (isRegistering) {
        return;
      }
      console.debug('[useFirebaseTokenRegistration][run] Refreshing Firebase Token.');

      setIsRegistering(true);
      setRegistrationError(null);

      await Firebase.getAndRegisterNextFCMToken().catch((err) => {
        console.error('[Pulsar] Firebase Token Registration Failed in useFirebaseTokenRegistration.', err);
        setRegistrationError('Device Registration to Notification Service Failed.');
      });

      setIsRegistering(false);
    };

    void run();
    const intervalId = setInterval(() => {
      void run();
    }, FCM_REGISTER_POLL_RATE);

    return () => {
      clearInterval(intervalId);
    };
  }, [useAuthentication.sessionToken, useAuthentication.fcmToken]);

  return { isRegistering, registrationError };
}
