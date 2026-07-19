import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Pressable, View, ScrollView } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { optionSheetStyles } from "@/components/modals/OptionSheet.styles";

const styles = { ...base, ...optionSheetStyles };
import { type Palette } from "@/theme/colors";
import { type MaterialIconName } from "@/types";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { Text } from "@/components/ui/AppText";

type PickerOption = { label: string; value: string; icon?: MaterialIconName; tone?: string; fontFamily?: string; softBg?: string };
type PickerConfig = { title: string; options: PickerOption[]; selectedValue: string; onSelect: (value: string) => void };
export type OptionSheetHandle = { open: (config: PickerConfig) => void };

export const OptionSheet = forwardRef<OptionSheetHandle, { colors: Palette }>(function OptionSheet({ colors }, ref) {
  const [config, setConfig] = useState<PickerConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const pendingSelection = useRef<{ value: string; onSelect: (value: string) => void } | null>(null);
  const close = useCallback(() => setVisible(false), []);
  const transition = useModalTransition(visible, 24, 1, () => {
    const pending = pendingSelection.current;
    pendingSelection.current = null;
    if (pending) pending.onSelect(pending.value);
  });
  useImperativeHandle(ref, () => ({
    open(next) {
      pendingSelection.current = null;
      setConfig(next);
      setVisible(true);
    },
  }), []);

  if (!config || !transition.modalVisible) return null;
  return (
    <Modal visible={transition.modalVisible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.optionOverlay, { backgroundColor: colors.overlay }, transition.containerStyle]}>
        <Pressable style={styles.optionBackdrop} onPress={close} />
        <Animated.View
          style={[
            optionSheetStylesMini.sheet,
            { backgroundColor: colors.card },
            transition.panelStyle,
          ]}
        >
          {/* Header — title + minimal close button (no background) */}
          <View style={styles.optionHeader}>
            <Text
              style={[styles.optionTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {config.title || ""}
            </Text>
            <Pressable
              onPress={close}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.optionClose}
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.optionList}
            contentContainerStyle={styles.optionListContent}
            showsVerticalScrollIndicator={false}
          >
            {config.options.map((option) => {
              const selected = option.value === config.selectedValue;
              const hasIcon = Boolean(option.icon);
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionRow,
                    selected && {
                      backgroundColor:
                        option.softBg ||
                        (option.tone ? `${option.tone}20` : colors.primarySoft),
                    },
                  ]}
                  onPress={() => {
                    pendingSelection.current = { value: option.value, onSelect: config.onSelect };
                    close();
                  }}
                >
                  {/* Icon — only when explicitly provided */}
                  {hasIcon && (
                    <View style={styles.optionIcon}>
                      <MaterialCommunityIcons
                        name={option.icon!}
                        size={20}
                        color={option.tone || (selected ? colors.primary : colors.text)}
                      />
                    </View>
                  )}

                  {/* Label */}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.optionLabel,
                      {
                        color: option.tone || (selected ? colors.primary : colors.text),
                        fontFamily: option.fontFamily,
                        fontWeight: selected ? "600" : "500",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

const optionSheetStylesMini = StyleSheet.create({
  sheet: {
    width: "100%",
    maxHeight: "70%",
    borderTopWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
});
