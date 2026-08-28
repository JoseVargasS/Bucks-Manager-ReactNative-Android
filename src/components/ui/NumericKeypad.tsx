import { memo, useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type Palette } from "@/theme/colors";
import { Text } from "./AppText";
import { applyBackspace, applyChar } from "./numericKeypadLogic";
import { RADIUS } from "@/theme/radii";

type Key =
  | { kind: "char"; value: string }
  | { kind: "backspace" }
  | { kind: "done" }
  | { kind: "spacer" };

const ROWS: ReadonlyArray<ReadonlyArray<Key>> = [
  [
    { kind: "char", value: "1" },
    { kind: "char", value: "2" },
    { kind: "char", value: "3" },
    { kind: "char", value: "+" },
    { kind: "backspace" },
  ],
  [
    { kind: "char", value: "4" },
    { kind: "char", value: "5" },
    { kind: "char", value: "6" },
    { kind: "char", value: "-" },
    { kind: "char", value: "(" },
  ],
  [
    { kind: "char", value: "7" },
    { kind: "char", value: "8" },
    { kind: "char", value: "9" },
    { kind: "char", value: "/" },
    { kind: "char", value: ")" },
  ],
  [
    { kind: "spacer" },
    { kind: "char", value: "0" },
    { kind: "char", value: "." },
    { kind: "char", value: "*" },
    { kind: "done" },
  ],
];

export const NumericKeypad = memo(function NumericKeypad({
  visible,
  value,
  cursor,
  onChange,
  onDone,
  colors,
}: {
  visible: boolean;
  value: string;
  cursor: number;
  onChange: (nextValue: string, nextCursor: number) => void;
  onDone: () => void;
  colors: Palette;
}) {
  // Refs let the setInterval callback see the latest value/cursor
  // without re-subscribing every tick.
  const valueRef = useRef(value);
  const cursorRef = useRef(cursor);
  useEffect(() => {
    valueRef.current = value;
    cursorRef.current = cursor;
  });

  const timersRef = useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    interval: ReturnType<typeof setInterval> | null;
  }>({ timeout: null, interval: null });

  const stopContinuousBackspace = () => {
    if (timersRef.current.timeout) {
      clearTimeout(timersRef.current.timeout);
      timersRef.current.timeout = null;
    }
    if (timersRef.current.interval) {
      clearInterval(timersRef.current.interval);
      timersRef.current.interval = null;
    }
  };

  const startContinuousBackspace = () => {
    const edit = applyBackspace(valueRef.current, cursorRef.current);
    if (!edit) return;
    onChange(edit.value, edit.cursor);
    timersRef.current.timeout = setTimeout(() => {
      timersRef.current.interval = setInterval(() => {
        const next = applyBackspace(valueRef.current, cursorRef.current);
        if (!next) {
          stopContinuousBackspace();
          return;
        }
        onChange(next.value, next.cursor);
      }, 35);
    }, 200);
  };

  useEffect(() => {
    if (!visible) stopContinuousBackspace();
  }, [visible]);

  useEffect(() => {
    return () => stopContinuousBackspace();
  }, []);

  if (!visible) return null;

  const pressChar = (ch: string) => {
    const edit = applyChar(value, cursor, ch);
    onChange(edit.value, edit.cursor);
  };
  const pressBackspace = () => {
    const edit = applyBackspace(value, cursor);
    if (edit) onChange(edit.value, edit.cursor);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((key, colIdx) => {
            if (key.kind === "spacer") {
              return <View key={colIdx} style={styles.key} />;
            }
            if (key.kind === "char") {
              return (
                <Pressable
                  key={colIdx}
                  onPress={() => pressChar(key.value)}
                  android_disableSound
                  style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: colors.input, borderColor: colors.border },
                    pressed && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.keyText, { color: colors.text }]}>{key.value}</Text>
                </Pressable>
              );
            }
            if (key.kind === "backspace") {
              return (
                <Pressable
                  key={colIdx}
                  onPress={pressBackspace}
                  onLongPress={startContinuousBackspace}
                  onPressOut={stopContinuousBackspace}
                  delayLongPress={200}
                  android_disableSound
                  style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: colors.input, borderColor: colors.border },
                    pressed && { backgroundColor: colors.expenseSoft, borderColor: colors.expense },
                  ]}
                >
                  <MaterialCommunityIcons name="backspace-outline" size={22} color={colors.text} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={colIdx}
                onPress={onDone}
                android_disableSound
                style={({ pressed }) => [
                  styles.key,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <MaterialCommunityIcons name="keyboard-return" size={22} color={colors.onPrimary} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  key: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 22,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
});
