import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { savePendingInvite } from '../../lib/api';

// Deep-link target for sleeple://invite/<code>. Stores the code and hands
// off to the app root: the board redeems it after auth (invite redeem
// needs a session; a cold user goes through OTP sign-in first).
export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();

  useEffect(() => {
    if (typeof code === 'string' && code.trim()) {
      void savePendingInvite(code);
    }
  }, [code]);

  return <Redirect href="/" />;
}
