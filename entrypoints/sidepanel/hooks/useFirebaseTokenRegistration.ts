import { useEffect, useState } from 'react';

import { FCM_REGISTER_POLL_RATE } from '../../shared/const.ts';
import { Firebase } from '../../shared/firebase.ts';
import type { AppUseSession } from './useSession.ts';

interface UseFirebaseTokenRegistration {
  isRegistering: boolean;
  registrationError: string | null;
}

export function useFirebaseTokenRegistration({ appUseSession }: {
  appUseSession: AppUseSession;
}): UseFirebaseTokenRegistration {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  useEffect(() => {
    if (appUseSession.sessionToken === null || appUseSession.sessionToken.trim().length === 0) {
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
  }, [appUseSession.sessionToken]);

  return { isRegistering, registrationError };
}
