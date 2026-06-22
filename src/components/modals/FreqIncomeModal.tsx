import { useRef } from "react";
import { Alert, Animated, Modal, TouchableOpacity } from "react-native";
import { styles } from "../../styles/globalStyles";
import { ModalHeader } from "../ui/ModalHeader";
import { Field } from "../ui/Field";
import { ActionRow } from "../ui/ActionRow";
import { Palette } from "../../theme/colors";
import { UiCopy } from "../../i18n";
import { useModalTransition } from "../ui/useModalTransition";

export function FreqIncomeModal({ visible, colors, copy, value, setValue, onClose, onSubmit }: {
  visible: boolean; colors: Palette; value: string; setValue: (v: string) => void; onClose: () => void; onSubmit: () => void;
  copy: UiCopy;
}) {
  const pendingSubmit = useRef(false);
  const transition = useModalTransition(visible, 12, 0.985, () => {
    if (!pendingSubmit.current) return;
    pendingSubmit.current = false;
    onSubmit();
  });
  const submit = () => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert(
        copy.languageCode === "en" ? "Invalid amount" : "Monto inválido",
        copy.languageCode === "en" ? "Enter a valid amount." : "Ingresa un monto válido.",
      );
      return;
    }
    pendingSubmit.current = true;
    onClose();
  };

  if (!transition.modalVisible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { backgroundColor: colors.overlay }, transition.containerStyle]}>
        <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.modal, { backgroundColor: colors.card }, transition.panelStyle]}>
          <ModalHeader title={copy.frequentIncomeTitle} icon="cash" colors={colors} onClose={onClose} />
          <Field label={copy.amount} value={value} onChangeText={setValue} colors={colors} />
          <ActionRow colors={colors} onCancel={onClose} onSubmit={submit} submitLabel={copy.save} cancelLabel={copy.cancel} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
