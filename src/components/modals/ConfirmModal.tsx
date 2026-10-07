import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";
import { s } from "./ConfirmModal.styles";
const styles = { ...base, ...recordModalStyles };
import { type Palette } from "@/theme/colors";
import { type Transaction } from "@/types";
import { formatMoney } from "@/domain/bucksLogic";
import { typeLabel } from "@/utils/formats";
import { type UiCopy } from "@/i18n";
import { type MaterialIconName } from "@/types";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { Text } from "@/components/ui/AppText";

type ConfirmKind = "delete" | "deleteSelected" | "disconnect" | "removeAccount" | "removeConnectedAccount";

export interface ConfirmConfig {
  kind: ConfirmKind;
  tx?: Transaction;
  count?: number;
  email?: string;
  name?: string;
}

export function ConfirmModal({
  config,
  colors,
  currencySymbol,
  copy,
  onClose,
  onConfirm,
}: {
  config: ConfirmConfig | null;
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  onClose: () => void;
  onConfirm: (config: ConfirmConfig) => void;
}) {
  const [displayConfig, setDisplayConfig] = useState(config);
  const pendingConfirm = useRef<ConfirmConfig | null>(null);
  const transition = useModalTransition(Boolean(config), 12, 0.985, () => {
    const pending = pendingConfirm.current;
    pendingConfirm.current = null;
    if (pending) onConfirm(pending);
  });

  useLayoutEffect(() => {
    if (config) setDisplayConfig(config);
  }, [config]);

  const current = config || displayConfig;
  if (!current || !transition.modalVisible) return null;
  const isAccountAction =
    current.kind === "disconnect" || current.kind === "removeAccount" || current.kind === "removeConnectedAccount";
  const title =
    current.kind === "delete"
      ? copy.confirmDeleteTitle
      : current.kind === "deleteSelected"
        ? copy.confirmDeleteSelectedTitle
        : current.kind === "removeAccount" || current.kind === "removeConnectedAccount"
          ? copy.removeAccountTitle
          : copy.signOutTitle;
  const message =
    current.kind === "delete"
      ? copy.confirmDeleteMsg
      : current.kind === "deleteSelected"
        ? copy.confirmDeleteSelectedMsg
        : current.kind === "removeConnectedAccount" && current.email
          ? `¿Quitar ${current.name ? `${current.name} (${current.email})` : current.email} de Quipu? Su hoja Drive no se borra.`
          : current.kind === "removeAccount"
            ? copy.removeAccountMessage
            : copy.signOutMessage;
  const accent = colors.expense;
  const accentSoft = colors.expenseSoft;
  const icon: MaterialIconName = isAccountAction ? "account-off" : "trash-can";
  const actionLabel =
    current.kind === "removeAccount" || current.kind === "removeConnectedAccount"
      ? copy.removeAccount
      : current.kind === "disconnect"
        ? copy.signOut
        : copy.confirm;

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
        <Pressable
          style={styles.optionBackdrop}
          onPress={onClose}
        />
          <Animated.View
            style={[
              styles.recordModal,
              { backgroundColor: colors.card },
              transition.panelStyle,
            ]}
          >
            <Animated.View style={transition.contentStyle}>
            <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name={icon} size={19} color={accent} />{" "}
              {title}
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

          <View style={s.body}>
            {current.tx && (
              <View
                style={[s.previewCard, { backgroundColor: colors.input }]}
              >
                <View
                  style={[s.previewIcon, { backgroundColor: accentSoft }]}
                >
                  <MaterialCommunityIcons
                    name={
                      current.tx.amount >= 0
                        ? "bank-transfer-in"
                        : "receipt-text-outline"
                    }
                    size={22}
                    color={current.tx.amount >= 0 ? colors.income : colors.expense}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={[s.previewLabel, { color: colors.muted }]}
                  >
                    {typeLabel(current.tx.type, copy)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[s.previewAmount, { color: current.tx.amount >= 0 ? colors.income : colors.expense }]}
                  >
                    {formatMoney(current.tx.amount, currencySymbol)}
                  </Text>
                  {!!current.tx.detail && (
                    <Text
                      numberOfLines={1}
                      style={[s.previewDetail, { color: colors.text }]}
                    >
                      {current.tx.detail}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <Text
              style={[s.message, { color: colors.muted }]}
            >
              {message}
            </Text>

            <View style={styles.recordActions}>
              <Pressable
                style={[
                  styles.recordCancel,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
                onPress={onClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={colors.text}
                />
                <Text style={[styles.recordCancelText, { color: colors.text }]}>
                  {copy.cancel}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.recordSubmit, { backgroundColor: accent }]}
                onPress={() => {
                  pendingConfirm.current = current;
                  onClose();
                }}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={colors.tagTextLight}
                />
                <Text
                  style={[
                    styles.recordSubmitText,
                    { color: colors.tagTextLight },
                  ]}
                >
                  {actionLabel}
                </Text>
              </Pressable>
              </View>
            </View>
            </Animated.View>
          </Animated.View>
      </Animated.View>
    </Modal>
  );
}
