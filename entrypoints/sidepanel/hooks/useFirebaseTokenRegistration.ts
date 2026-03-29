import { useEffect, useState } from 'react';

import { FCM_REGISTER_POLL_RATE } from '../../shared/const.ts';
import { Firebase } from '../../shared/firebase.ts';
import { type AppUseSession, useSession } from './useSession.ts';

interface UseFirebaseTokenRegistration {
  isRegistering: boolean;
  registrationError: string | null;
}

export function useFirebaseTokenRegistration(appUseSession: AppUseSession): UseFirebaseTokenRegistration {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const { sessionToken } = useSession(appUseSession);

  useEffect(() => {
    if (sessionToken === null || sessionToken.trim().length === 0) {
      return;
    }

    const run = async (): Promise<void> => {
      if (isRegistering) {
        return;
      }
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
  }, [sessionToken]);

  return { isRegistering, registrationError };
}
