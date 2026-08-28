import { useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";
import { base } from "@/styles/baseStyles";
const styles = { ...base, ...recordModalStyles };
import { type Palette } from "@/theme/colors";
import { Text } from "@/components/ui/AppText";
import { RADIUS } from "@/theme/radii";

export function CurrencyPickerModal({
  visible,
  colors,
  copy,
  options,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  colors: Palette;
  copy: { chooseCurrency: string; continue: string };
  options: Array<{ label: string; value: string }>;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState("$");

  if (!visible) return null;

  const handleConfirm = () => {
    onConfirm(selected || "$");
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.optionBackdrop} onPress={onClose} />
        <View style={[styles.recordModal, { backgroundColor: colors.card }]}>
          <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="currency-usd" size={19} color={colors.primary} />{" "}
              {copy.chooseCurrency}
            </Text>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: colors.input }]}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = item.value === selected;
              return (
                <Pressable
                  onPress={() => setSelected(item.value)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: RADIUS.lg,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? colors.primary : "transparent",
                    }}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={14} color={colors.onPrimary} />
                    )}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? colors.primary : colors.text,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
            style={{ maxHeight: 400, paddingHorizontal: 8 }}
          />

          <View style={[styles.recordActions, { paddingHorizontal: 8, paddingBottom: 8 }]}>
            <Pressable
              style={[styles.recordCancel, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.recordCancelText, { color: colors.text }]}>
                {"Usar dólar ($)"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.recordSubmit, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
            >
              <MaterialCommunityIcons name="check" size={20} color={colors.onPrimary} />
              <Text style={[styles.recordSubmitText, { color: colors.onPrimary }]}>
                {copy.continue}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
