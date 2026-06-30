import { memo, useSyncExternalStore } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { type FontPreference } from "@/types";
import { FONT_FAMILIES, FONT_SIZE_SCALE } from "./fontConstants";

let fontFamily = FONT_FAMILIES.dmsans;
let fontPreference: FontPreference = "dmsans";
const listeners = new Set<() => void>();

export function setAppFontPreference(preference: FontPreference) {
  const next = getAppFontFamily(preference);
  if (next === fontFamily && preference === fontPreference) return;
  fontFamily = next;
  fontPreference = preference;
  listeners.forEach((listener) => listener());
}

export function getAppFontFamily(preference: FontPreference) {
  return FONT_FAMILIES[preference];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppFontFamily() {
  return useSyncExternalStore(
    subscribe,
    () => fontFamily,
    () => fontFamily,
  );
}

function useAppFontPreference() {
  return useSyncExternalStore(
    subscribe,
    () => fontPreference,
    () => fontPreference,
  );
}

function TextImpl({ style, ...props }: TextProps) {
  const family = useAppFontFamily();
  const preference = useAppFontPreference();
  const scale = FONT_SIZE_SCALE[preference] || 1;
  if (scale !== 1) {
    const flat = StyleSheet.flatten(style);
    const baseSize = typeof flat?.fontSize === "number" ? flat.fontSize : 16;
    const adjustedSize = Math.round(baseSize * scale);
    return (
      <NativeText
        {...props}
        style={[{ fontFamily: family }, style, { fontSize: adjustedSize }]}
      />
    );
  }
  return <NativeText {...props} style={[{ fontFamily: family }, style]} />;
}

function TextInputImpl({ style, ...props }: TextInputProps) {
  const family = useAppFontFamily();
  const preference = useAppFontPreference();
  const scale = FONT_SIZE_SCALE[preference] || 1;
  if (scale !== 1) {
    const flat = StyleSheet.flatten(style);
    const baseSize = typeof flat?.fontSize === "number" ? flat.fontSize : 16;
    const adjustedSize = Math.round(baseSize * scale);
    return (
      <NativeTextInput
        {...props}
        style={[{ fontFamily: family }, style, { fontSize: adjustedSize }]}
      />
    );
  }
  return <NativeTextInput {...props} style={[{ fontFamily: family }, style]} />;
}

export const Text = memo(TextImpl);
export const TextInput = memo(TextInputImpl);
