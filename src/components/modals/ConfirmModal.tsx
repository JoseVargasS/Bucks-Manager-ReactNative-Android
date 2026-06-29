import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Modal, TouchableOpacity, View } from "react-native";
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

type ConfirmKind = "delete" | "deleteSelected" | "disconnect" | "removeAccount";

export interface ConfirmConfig {
  kind: ConfirmKind;
  tx?: Transaction;
  count?: number;
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
    current.kind === "disconnect" || current.kind === "removeAccount";
  const title =
    current.kind === "delete"
      ? copy.confirmDeleteTitle
      : current.kind === "deleteSelected"
        ? copy.confirmDeleteSelectedTitle
        : current.kind === "removeAccount"
          ? copy.removeAccountTitle
          : copy.signOutTitle;
  const message =
    current.kind === "delete"
      ? copy.confirmDeleteMsg
      : current.kind === "deleteSelected"
        ? copy.confirmDeleteSelectedMsg
        : current.kind === "removeAccount"
          ? copy.removeAccountMessage
          : copy.signOutMessage;
  const accent = colors.red;
  const accentSoft = colors.expenseSoft;
  const icon: MaterialIconName = isAccountAction ? "account-off" : "trash-can";
  const actionLabel =
    current.kind === "removeAccount"
      ? copy.removeAccount
      : current.kind === "disconnect"
        ? copy.signOut
        : copy.confirm;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.modalOverlay,
          { backgroundColor: colors.overlay },
          transition.containerStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.optionBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.recordModal,
            { backgroundColor: colors.card },
            transition.panelStyle,
          ]}
        >
          <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name={icon} size={19} color={accent} />{" "}
              {title}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.input }]}
              onPress={onClose}
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
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
                    color={current.tx.amount >= 0 ? colors.green : colors.red}
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
                    style={[s.previewAmount, { color: current.tx.amount >= 0 ? colors.green : colors.red }]}
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
              <TouchableOpacity
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
              </TouchableOpacity>
              <TouchableOpacity
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
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
