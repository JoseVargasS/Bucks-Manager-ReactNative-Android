import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { isPinEnabled, savePin, verifyPin, clearPin } from "@/utils/pin";
import { type UiCopy } from "@/i18n";
import { PIN_DELAY_MS } from "@/theme/constants";

export function usePin(copy: UiCopy, errMsg: (error: unknown) => string) {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinLoading, setPinLoading] = useState(true);
  const [pinSetupVisible, setPinSetupVisible] = useState(false);
  const [pinWrong, setPinWrong] = useState(false);
  const pinLockedRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        pinLockedRef.current = true;
        setPinVerified(false);
      }
    });
    return () => sub.remove();
  }, []);

  const restorePinState = useCallback(async () => {
    try {
      const enabled = await isPinEnabled();
      setPinEnabled(enabled);
      setPinVerified(!enabled);
      pinLockedRef.current = false;
    } finally {
      setPinLoading(false);
    }
  }, []);

  const handlePinOpen = useCallback(() => {
    if (pinEnabled) {
      pinLockedRef.current = false;
      setPinEnabled(false);
      setPinVerified(true);
      void clearPin().catch((error) => {
        setPinEnabled(true);
        Alert.alert(copy.pinApp, errMsg(error));
      });
    } else {
      setPinSetupVisible(true);
    }
  }, [copy.pinApp, errMsg, pinEnabled]);

  const handlePinSave = useCallback((value: string) => {
    pinLockedRef.current = false;
    setPinEnabled(true);
    setPinVerified(true);
    void savePin(value).catch((error) => {
      setPinEnabled(false);
      Alert.alert(copy.pinApp, errMsg(error));
    });
  }, [copy.pinApp, errMsg]);

  const handlePinVerify = useCallback((pin: string) => {
    verifyPin(pin).then((ok) => {
      if (ok) {
        pinLockedRef.current = false;
        setPinVerified(true);
        setPinWrong(false);
      } else {
        setPinWrong(true);
        setTimeout(() => setPinWrong(false), PIN_DELAY_MS);
      }
    });
  }, []);

  return {
    pinEnabled,
    setPinEnabled,
    pinVerified,
    setPinVerified,
    pinLoading,
    setPinLoading,
    pinSetupVisible,
    setPinSetupVisible,
    pinWrong,
    setPinWrong,
    pinLockedRef,
    restorePinState,
    handlePinOpen,
    handlePinSave,
    handlePinVerify,
  };
}
