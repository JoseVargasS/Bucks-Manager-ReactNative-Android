import { Modal, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/globalStyles";
import { ModalHeader } from "../ui/ModalHeader";
import { Field } from "../ui/Field";
import { ActionRow } from "../ui/ActionRow";
import { Palette } from "../../theme/colors";
import { UiCopy } from "../../i18n";

export function FreqIncomeModal({ visible, colors, copy, value, setValue, onClose, onSubmit }: {
  visible: boolean; colors: Palette; value: string; setValue: (v: string) => void; onClose: () => void; onSubmit: () => void;
  copy: UiCopy;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <ModalHeader title={copy.frequentIncomeTitle} icon="cash" colors={colors} onClose={onClose} />
          <Field label={copy.amount} value={value} onChangeText={setValue} colors={colors} />
          <ActionRow colors={colors} onCancel={onClose} onSubmit={onSubmit} submitLabel={copy.save} cancelLabel={copy.cancel} />
        </View>
      </View>
    </Modal>
  );
}
