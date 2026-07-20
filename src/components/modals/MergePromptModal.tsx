import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";
import { mergeStyles } from "./MergePromptModal.styles";
const styles = { ...base, ...recordModalStyles };
import { type Palette } from "@/theme/colors";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { Text } from "@/components/ui/AppText";

export interface MergePromptConfig {
  localCount: number;
  remoteCount: number;
}

export function MergePromptModal({
  config,
  colors,
  copy,
  onClose,
  onMerge,
  onRemoteOnly,
}: {
  config: MergePromptConfig | null;
  colors: Palette;
  copy: {
    mergeTitle: string;
    mergeMsg: string;
    mergeOption: string;
    mergeRemoteOnly: string;
  };
  onClose: () => void;
  onMerge: () => void;
  onRemoteOnly: () => void;
}) {
  const [displayConfig, setDisplayConfig] = useState(config);
  const pendingAction = useRef<"merge" | "remote" | null>(null);
  const transition = useModalTransition(Boolean(config), 12, 0.985, () => {
    const pending = pendingAction.current;
    pendingAction.current = null;
    if (pending === "merge") onMerge();
    else onRemoteOnly();
  });

  useLayoutEffect(() => {
    if (config) setDisplayConfig(config);
  }, [config]);

  const current = config || displayConfig;
  if (!current || !transition.modalVisible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View
        style={[
          styles.modalOverlay,
          { backgroundColor: colors.overlay },
          transition.containerStyle,
        ]}
      >
        <Pressable style={styles.optionBackdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.recordModal,
            { backgroundColor: colors.card },
            transition.panelStyle,
          ]}
        >
          <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              {copy.mergeTitle}
            </Text>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: colors.input }]}
              onPress={onClose}
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={colors.text}
              />
            </Pressable>
          </View>

          <View style={mergeStyles.body}>
            <View style={[mergeStyles.countRow, { backgroundColor: colors.input }]}>
              <Text style={[mergeStyles.countLabel, { color: colors.muted }]}>
                En este dispositivo
              </Text>
              <Text style={[mergeStyles.countValue, { color: colors.text }]}>
                {current.localCount}
              </Text>
            </View>

            <View style={[mergeStyles.countRow, { backgroundColor: colors.input }]}>
              <Text style={[mergeStyles.countLabel, { color: colors.muted }]}>
                En tu hoja de Google
              </Text>
              <Text style={[mergeStyles.countValue, { color: colors.text }]}>
                {current.remoteCount}
              </Text>
            </View>

            <Text style={[mergeStyles.message, { color: colors.muted }]}>
              {copy.mergeMsg}
            </Text>

            <View style={styles.recordActions}>
              <Pressable
                style={[styles.recordCancel, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={() => {
                  pendingAction.current = "remote";
                  onClose();
                }}
              >
                <Text style={[styles.recordCancelText, { color: colors.text }]}>
                  {copy.mergeRemoteOnly}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.recordSubmit, { backgroundColor: colors.primary }]}
                onPress={() => {
                  pendingAction.current = "merge";
                  onClose();
                }}
              >
                <MaterialCommunityIcons name="merge" size={18} color={colors.onPrimary} />
                <Text style={[styles.recordSubmitText, { color: colors.onPrimary }]}>
                  {copy.mergeOption}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
