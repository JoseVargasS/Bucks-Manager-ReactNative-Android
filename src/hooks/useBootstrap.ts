import { useEffect, useState } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { hideAsync } from "expo-splash-screen";

export function useBootstrap(
  restorePreferences: () => Promise<void>,
  restoreSession: () => Promise<void>,
  restorePinState: () => Promise<void>,
) {
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    GoogleSignin.configure();
    void Promise.all([
      restorePreferences(),
      restoreSession(),
      restorePinState(),
    ])
      .catch(() => undefined)
      .finally(() => setBootstrapping(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bootstrapping) hideAsync().catch(() => undefined);
  }, [bootstrapping]);

  return bootstrapping;
}
