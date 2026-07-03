import { memo, useCallback, useRef } from "react";
import { PanResponder, View } from "react-native";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

function hslToHex(h: number, s = 80, l = 52): string {
  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l / 100 - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hueFromHex(hex: string): number {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return Math.round(h * 360);
}

const SEGMENTS = 36;

function hueAt(index: number): number {
  return Math.round((index / SEGMENTS) * 360);
}

export const ColorPicker = memo(function ColorPicker({
  color, onChange, compact = false,
}: {
  color: string;
  onChange: (c: string) => void;
  compact?: boolean;
}) {
  const stripH = compact ? 16 : 20;
  const previewSize = compact ? 18 : 24;
  const currentHue = hueFromHex(color);
  const layoutRef = useRef({ left: 0, width: 200 });

  const pick = useCallback((e: GestureResponderEvent) => {
    const { left, width } = layoutRef.current;
    if (width <= 0) return;
    const fraction = Math.max(0, Math.min(1, (e.nativeEvent.pageX - left) / width));
    onChange(hslToHex(Math.round(fraction * 360)));
  }, [onChange]);

  const panHandlers = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: pick,
    onPanResponderMove: pick,
  })).current.panHandlers;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    layoutRef.current.width = width;
  }, []);

  const onRef = useCallback((view: View | null) => {
    if (view) {
      view.measureInWindow((x) => { layoutRef.current.left = x; });
    }
  }, []);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          width: previewSize, height: previewSize,
          borderRadius: previewSize / 2,
          backgroundColor: color,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.25)",
        }}
      />
      <View
        ref={onRef}
        onLayout={onLayout}
        {...panHandlers}
        style={{
          flex: 1, height: stripH + 10,
          justifyContent: "center",
          position: "relative",
        }}
      >
        <View
          style={{
            height: stripH,
            borderRadius: stripH / 2,
            overflow: "hidden",
            flexDirection: "row",
          }}
        >
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <View
              key={i}
              style={{ flex: 1, backgroundColor: hslToHex(hueAt(i)) }}
            />
          ))}
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (currentHue / 360) * layoutRef.current.width - 6,
            top: (stripH + 10 - 14) / 2,
            width: 12,
            height: 14,
            borderRadius: 2,
            borderWidth: 2,
            borderColor: "#fff",
          }}
        />
      </View>
    </View>
  );
});
