import { useEffect, useState } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { hideAsync } from "expo-splash-screen";

const BOOTSTRAP_TIMEOUT_MS = 8000;

export type BootstrapState = boolean;

export function useBootstrap(
  restorePreferences: () => Promise<void>,
  restoreSession: () => Promise<void>,
  restorePinState: () => Promise<void>,
): BootstrapState {
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    try {
      GoogleSignin.configure();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[bootstrap] GoogleSignin.configure failed:", error);
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setBootstrapping(false);
    };
    const restore = Promise.all([
      restorePreferences(),
      restoreSession(),
      restorePinState(),
    ]);
    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.warn(`[bootstrap] restore timed out after ${BOOTSTRAP_TIMEOUT_MS}ms`);
        resolve();
      }, BOOTSTRAP_TIMEOUT_MS);
    });
    void Promise.race([restore, timeout])
      .catch(() => undefined)
      .finally(finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bootstrapping) hideAsync().catch(() => undefined);
  }, [bootstrapping]);

  return bootstrapping;
}
