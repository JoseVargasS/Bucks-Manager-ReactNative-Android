import { useEffect, useState } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { hideAsync } from "expo-splash-screen";

const BOOTSTRAP_TIMEOUT_MS = 8000;

export function useBootstrap(
  restorePreferences: () => Promise<void>,
  restoreSession: () => Promise<void>,
  restorePinState: () => Promise<void>,
) {
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    GoogleSignin.configure();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setBootstrapping(false);
    };
    const timer = setTimeout(finish, BOOTSTRAP_TIMEOUT_MS);
    void Promise.all([
      restorePreferences(),
      restoreSession(),
      restorePinState(),
    ])
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        finish();
      });
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bootstrapping) hideAsync().catch(() => undefined);
  }, [bootstrapping]);

  return bootstrapping;
}
