import { forwardRef, memo } from "react";
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from "react-native";
import { type Palette } from "@/theme/colors";

// forwardRef: parent calls .focus() on the underlying TextInput after
// addLineItem so the new line is immediately editable.
export const AmountInput = memo(forwardRef<TextInput, {
  value: string;
  placeholder: string;
  colors: Palette;
  cursor: number;
  onValueChange: (v: string) => void;
  onCursorChange: (pos: number) => void;
  onFocus?: () => void;
  style?: StyleProp<TextStyle>;
}>(function AmountInput({
  value,
  placeholder,
  colors,
  cursor,
  onValueChange,
  onCursorChange,
  onFocus,
  style,
}, ref) {
  return (
    <TextInput
      ref={ref}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      selection={{ start: cursor, end: cursor }}
      onChangeText={onValueChange}
      onSelectionChange={(e) => onCursorChange(e.nativeEvent.selection.start)}
      onFocus={onFocus}
      showSoftInputOnFocus={false}
      keyboardType="numeric"
      style={[styles.input, { color: value ? colors.text : colors.muted }, style]}
    />
  );
}));

const styles = StyleSheet.create({
  input: {
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
});
