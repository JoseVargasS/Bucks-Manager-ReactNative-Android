import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type Palette } from "@/theme/colors";
import { PIN_LENGTH } from "@/theme/constants";
import { s } from "./PinScreen.styles";
import { type UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";

export function PinScreen({ colors, copy, title, subtitle, wrong, bgColor, onFill }: {
  colors: Palette;
  copy: UiCopy;
  title?: string;
  subtitle?: string;
  wrong: boolean;
  bgColor?: string;
  onFill: (pin: string) => void;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [showingError, setShowingError] = useState(false);
  const shakeRef = useRef<Animated.Value | null>(null);
  if (!shakeRef.current) shakeRef.current = new Animated.Value(0);
  const shake = shakeRef.current;
  const filled = digits.length === PIN_LENGTH;

  useEffect(() => {
    if (filled) onFill(digits.join(""));
  }, [digits, filled, onFill]);

  useEffect(() => {
    if (wrong && !showingError) {
      setShowingError(true);
      setDigits([]);
      Animated.sequence([
        Animated.timing(shake, { toValue: 12, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -12, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]).start(() => setShowingError(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- showingError is intentionally excluded; adding it re-fires the effect
  }, [wrong, shake]);

  function pressDigit(d: string) {
    if (filled || showingError) return;
    setDigits((prev) => [...prev, d]);
  }

  function pressBackspace() {
    if (showingError) return;
    setDigits((prev) => prev.slice(0, -1));
  }

  return (
    <View style={[s.container, { backgroundColor: bgColor }]}>
      {title ? (
        <Text style={[s.title, { color: colors.text }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[s.subtitle, { color: colors.textSubtle }]}>{subtitle}</Text>
      ) : (
        <View style={{ marginBottom: 28 }} />
      )}

      <Animated.View style={[s.dotRow, { transform: [{ translateX: shake }] }]}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => i).map((i) => {
          const dot = digits.length > i;
          return (
            <View
              key={i}
              style={[s.dot, {
                backgroundColor: dot ? (showingError ? colors.expense : colors.primary) : "transparent",
                borderWidth: dot ? 0 : 2,
                borderColor: colors.borderStrong,
              }]}
            />
          );
        })}
      </Animated.View>

      {showingError && (
        <Text style={[s.errorText, { color: colors.expense }]}>{copy.pinIncorrect}</Text>
      )}

      <View style={s.keypad}>
        {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row, rowIndex) => (
          <View key={rowIndex} style={s.keypadRow}>
            {row.map((d) => (
              <Pressable key={d} onPress={() => pressDigit(d)} style={({ pressed }) => [s.key, { backgroundColor: colors.input }, pressed && { opacity: 0.6 }]}>
                <Text style={[s.keyText, { color: colors.text }]}>{d}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={s.keypadRow}>
          <Pressable onPress={pressBackspace} style={({ pressed }) => [s.key, { backgroundColor: colors.input }, pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="backspace-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => pressDigit("0")} style={({ pressed }) => [s.key, { backgroundColor: colors.input }, pressed && { opacity: 0.6 }]}>
            <Text style={[s.keyText, { color: colors.text }]}>0</Text>
          </Pressable>
          <View style={s.placeholder} />
        </View>
      </View>
    </View>
  );
}

