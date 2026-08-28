import { memo, useCallback, useRef } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type Palette } from "@/theme/colors";
import { RADIUS } from "@/theme/radii";
import { Text } from "./AppText";
import { OptionSheet, type OptionSheetHandle } from "@/components/modals/OptionSheet";

type SelectOption = { label: string; value: string; color?: string; softBg?: string };

export const Select = memo(function Select({ value, options, onSelect, colors, placeholder, style, title, hideArrow, buttonStyle }: {
  value: string; options: SelectOption[]; onSelect: (v: string) => void; colors: Palette;
  placeholder?: string; style?: ViewStyle; title?: string; hideArrow?: boolean; buttonStyle?: ViewStyle;
}) {
  const sheetRef = useRef<OptionSheetHandle>(null);
  const pressedRef = useRef<Animated.Value | null>(null);
  if (!pressedRef.current) pressedRef.current = new Animated.Value(0);
  const pressed = pressedRef.current;
  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : placeholder;

  const handlePress = useCallback(() => {
    Keyboard.dismiss();
    sheetRef.current?.open({
      title: title || placeholder || label || "",
      selectedValue: value,
      options: options.map((opt) => ({
        label: opt.label,
        value: opt.value,
        icon: undefined,
        tone: opt.color,
        softBg: opt.softBg,
      })),
      onSelect,
    });
  }, [options, value, onSelect, title, placeholder, label]);

  const centerText = hideArrow && !selected?.color;

  const animatePress = (toValue: number, duration: number) => {
    pressed.stopAnimation();
    Animated.timing(pressed, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  return (
    <>
      <View style={style}>
        <Animated.View style={{ opacity: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }), transform: [{ scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) }] }}>
          <Pressable
            style={[selectStyles.button, { backgroundColor: colors.input, borderColor: colors.border, justifyContent: centerText ? "center" : "space-between" }, buttonStyle]}
            onPress={handlePress}
            onPressIn={() => animatePress(1, 70)}
            onPressOut={() => animatePress(0, 110)}
            accessibilityLabel={title || placeholder || label}
          >
            {selected?.color && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: selected.color }} />}
            <Text numberOfLines={1} style={[selectStyles.buttonText, { color: selected?.color || (selected ? colors.text : colors.muted) }]}>{label}</Text>
            {!hideArrow && <MaterialCommunityIcons name="chevron-down" size={18} color={colors.muted} />}
          </Pressable>
        </Animated.View>
      </View>
      <OptionSheet ref={sheetRef} colors={colors} />
    </>
  );
});

const selectStyles = {
  button: { borderRadius: RADIUS.md, paddingHorizontal: 12, minHeight: 42, flexDirection: "row" as const, alignItems: "center" as const, gap: 8, borderWidth: 1 },
  buttonText: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: "600" as const, textAlign: "center" as const },
};
