import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Pressable, View, ScrollView, PanResponder } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { optionSheetStyles } from "@/components/modals/OptionSheet.styles";

const styles = { ...base, ...optionSheetStyles };
import { type Palette } from "@/theme/colors";
import { type MaterialIconName } from "@/types";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { Text } from "@/components/ui/AppText";
import { RADIUS } from "@/theme/radii";

type PickerOption = { label: string; value: string; icon?: MaterialIconName; tone?: string; fontFamily?: string; softBg?: string };
type PickerConfig = {
  title: string;
  options: PickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  preview?: { hint: string; example: string };
  keepOpenOnSelect?: boolean;
  sliderValues?: number[];
};
export type OptionSheetHandle = { open: (config: PickerConfig) => void };

export const OptionSheet = forwardRef<OptionSheetHandle, { colors: Palette }>(function OptionSheet({ colors }, ref) {
  const [config, setConfig] = useState<PickerConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [localSelected, setLocalSelected] = useState<string>("");
  const [trackWidth, setTrackWidth] = useState(280);
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
      setLocalSelected(next.selectedValue);
      setVisible(true);
    },
  }), []);

  const isSlider = Boolean(config?.sliderValues && config.sliderValues.length > 1);
  const sliderValues = useMemo(() => config?.sliderValues ?? [], [config?.sliderValues]);
  const sliderIndex = isSlider ? Math.max(0, sliderValues.findIndex((v) => String(v) === localSelected)) : 0;
  const clampedIndex = sliderIndex === -1 ? 2 : sliderIndex; // default M

  const setByFraction = useCallback(
    (fraction: number) => {
      if (!isSlider) return;
      const idx = Math.round(fraction * (sliderValues.length - 1));
      const clamped = Math.max(0, Math.min(sliderValues.length - 1, idx));
      const val = String(sliderValues[clamped]);
      setLocalSelected((prev) => (prev === val ? prev : val));
    },
    [isSlider, sliderValues],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isSlider,
        onMoveShouldSetPanResponder: () => isSlider,
        onPanResponderGrant: (evt) => {
          const frac = Math.max(0, Math.min(1, evt.nativeEvent.locationX / trackWidth));
          setByFraction(frac);
        },
        onPanResponderMove: (evt) => {
          const frac = Math.max(0, Math.min(1, evt.nativeEvent.locationX / trackWidth));
          setByFraction(frac);
        },
      }),
    [isSlider, trackWidth, setByFraction],
  );

  if (!config || !transition.modalVisible) return null;
  return (
    <Modal visible={transition.modalVisible} transparent animationType="none" onRequestClose={close}>
      <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
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

          {/* Preview inside modal — for font size selector */}
          {config.preview && (
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: RADIUS.md,
                backgroundColor: colors.input,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontSize: Math.round(13 * (parseFloat(localSelected) || 1)),
                  fontWeight: "600",
                }}
                numberOfLines={1}
              >
                {config.preview.hint}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: Math.round(15 * (parseFloat(localSelected) || 1)),
                    fontWeight: "700",
                  }}
                  numberOfLines={1}
                >
                  {config.preview.example}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: Math.round(13 * (parseFloat(localSelected) || 1)),
                  }}
                  numberOfLines={1}
                >
                  • 0 O 1 l I
                </Text>
              </View>
              {isSlider && (
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                  {parseFloat(localSelected).toFixed(2)}x · {Math.round(15 * parseFloat(localSelected))}px
                </Text>
              )}
            </View>
          )}

          {isSlider ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
              {/* Slider track — usa locationX/trackWidth, sin measureInWindow */}
              <View
                onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                {...panResponder.panHandlers}
                style={{
                  height: 28,
                  justifyContent: "center",
                }}
              >
                <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: "hidden" }}>
                  <View
                    style={{
                      height: 4,
                      width: `${(clampedIndex / (sliderValues.length - 1)) * 100}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
                {/* ticks */}
                <View style={{ position: "absolute", left: 0, right: 0, top: 12, flexDirection: "row", justifyContent: "space-between" }}>
                  {sliderValues.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: i <= clampedIndex ? colors.primary : colors.borderStrong,
                        marginTop: 0,
                      }}
                    />
                  ))}
                </View>
                {/* thumb — foco, 1.5 */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: (clampedIndex / (sliderValues.length - 1)) * trackWidth - 10,
                    top: 4,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: colors.primary,
                    borderWidth: 1.5,
                    borderColor: colors.card,
                    shadowColor: colors.shadow,
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                />
              </View>
              {/* labels */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                {["XS", "S", "M", "L", "XL"].map((lbl, i) => (
                  <Pressable key={lbl} onPress={() => setLocalSelected(String(sliderValues[i]))} style={{ padding: 6 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: i === clampedIndex ? "700" : "500",
                        color: i === clampedIndex ? colors.primary : colors.muted,
                      }}
                    >
                      {lbl}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {/* Accept / Cancel */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={close}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: "center", backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    pendingSelection.current = { value: localSelected, onSelect: config.onSelect };
                    close();
                  }}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: "center", backgroundColor: colors.primary }}
                >
                  <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Aplicar</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <ScrollView
            style={styles.optionList}
            contentContainerStyle={styles.optionListContent}
            showsVerticalScrollIndicator={false}
          >
              {config.options.map((option) => {
                const selected = option.value === localSelected;
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
                      if (config.keepOpenOnSelect) {
                        setLocalSelected(option.value);
                        config.onSelect(option.value);
                      } else {
                        pendingSelection.current = { value: option.value, onSelect: config.onSelect };
                        close();
                      }
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
          )}
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
