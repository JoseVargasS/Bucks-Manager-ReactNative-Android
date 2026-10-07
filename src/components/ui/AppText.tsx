/* eslint-disable react-refresh/only-export-components */
import { forwardRef, memo, useSyncExternalStore } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { type FontPreference } from "@/types";
import { FONT_FAMILIES, FONT_SIZE_SCALE, MAX_COMBINED_FONT_SCALE } from "./fontConstants";

let fontFamily = FONT_FAMILIES.inter;
let fontPreference: FontPreference = "inter";
const listeners = new Set<() => void>();

// Global font size scale (segundo store) — 0.85-1.15, default 1.0
let fontSizeScale = 1;
const scaleListeners = new Set<() => void>();

export function setAppFontPreference(preference: FontPreference) {
  const next = getAppFontFamily(preference);
  if (next === fontFamily && preference === fontPreference) return;
  fontFamily = next;
  fontPreference = preference;
  listeners.forEach((listener) => listener());
}

export function setAppFontSizeScale(scale: number) {
  const next = Number(scale);
  if (!Number.isFinite(next) || next === fontSizeScale) return;
  // clampa a rango permitido 0.85-1.15
  const clamped = Math.max(0.85, Math.min(1.15, Math.round(next * 100) / 100));
  if (clamped === fontSizeScale) return;
  fontSizeScale = clamped;
  scaleListeners.forEach((l) => l());
}

function getAppFontFamily(preference: FontPreference) {
  return FONT_FAMILIES[preference];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeScale(listener: () => void) {
  scaleListeners.add(listener);
  return () => scaleListeners.delete(listener);
}

export function useAppFontFamily() {
  return useSyncExternalStore(subscribe, () => fontFamily, () => fontFamily);
}

function useAppFontPreference() {
  return useSyncExternalStore(subscribe, () => fontPreference, () => fontPreference);
}

export function useAppFontSizeScale() {
  return useSyncExternalStore(subscribeScale, () => fontSizeScale, () => fontSizeScale);
}

function TextImpl({ style, ...props }: TextProps) {
  const family = useAppFontFamily();
  const preference = useAppFontPreference();
  const globalScale = useAppFontSizeScale();
  const prefScale = FONT_SIZE_SCALE[preference] || 1;
  const combined = Math.min(prefScale * globalScale, MAX_COMBINED_FONT_SCALE);
  if (combined !== 1) {
    const flat = StyleSheet.flatten(style);
    const baseSize = typeof flat?.fontSize === "number" ? flat.fontSize : 16;
    // Sin redondeo a enteros: redondear aplastaba combinaciones distintas
    // al mismo pixel (ej. 15 combinaciones caian a 11px en caption).
    // RN renderiza fracciones sin problema.
    const adjustedSize = baseSize * combined;
    return <NativeText {...props} style={[{ fontFamily: family }, style, { fontSize: adjustedSize }]} />;
  }
  return <NativeText {...props} style={[{ fontFamily: family }, style]} />;
}

const TextInputImpl = forwardRef<NativeTextInput, TextInputProps>(function TextInputImpl({ style, ...props }, ref) {
  const family = useAppFontFamily();
  const preference = useAppFontPreference();
  const globalScale = useAppFontSizeScale();
  const prefScale = FONT_SIZE_SCALE[preference] || 1;
  const combined = Math.min(prefScale * globalScale, MAX_COMBINED_FONT_SCALE);
  if (combined !== 1) {
    const flat = StyleSheet.flatten(style);
    const baseSize = typeof flat?.fontSize === "number" ? flat.fontSize : 16;
    const adjustedSize = baseSize * combined;
    return <NativeTextInput ref={ref} {...props} style={[{ fontFamily: family }, style, { fontSize: adjustedSize }]} />;
  }
  return <NativeTextInput ref={ref} {...props} style={[{ fontFamily: family }, style]} />;
});

export const Text = memo(TextImpl);
export const TextInput = memo(TextInputImpl);
