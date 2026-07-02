import { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { withAlpha } from "@/utils/helpers";
import { dark, type Palette } from "@/theme/colors";
import { type Transaction } from "@/types";
import { type UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";
import { expensesStyles } from "@/components/screens/ExpensesView.styles";

const s = expensesStyles;

type SelectionBarProps = {
  selectedCount: number;
  selectedTx: Transaction | undefined | null;
  copy: UiCopy;
  colors: Palette;
  onEdit: (tx: Transaction) => void;
  onDeleteSelected: () => void;
};

export const SelectionBar = memo(function SelectionBar({
  selectedCount,
  selectedTx,
  copy,
  colors,
  onEdit,
  onDeleteSelected,
}: SelectionBarProps) {
  return (
    <View
      style={[
        s.selectionBar,
        {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 92,
          overflow: "hidden",
          borderWidth: 0.5,
          borderColor: withAlpha(colors.borderStrong, colors.bg === dark.bg ? 0.26 : 0.54),
          shadowColor: colors.shadow,
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -3 },
          elevation: 10,
        },
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: withAlpha(colors.card, colors.bg === dark.bg ? 0.85 : 0.82),
          },
        ]}
      />
      <Text style={[s.selectionText, { color: colors.text, zIndex: 1 }]}>
        {selectedCount === 1
          ? copy.selectedOne
          : `${selectedCount} ${copy.selectedMany}`}
      </Text>
      <View style={[s.selectionActions, { zIndex: 1 }]}>
        {selectedCount === 1 && selectedTx && (
          <TouchableOpacity
            style={[
              s.selectionBtn,
              {
                backgroundColor: withAlpha(colors.editBg, 0.85),
                borderColor: colors.editBorder,
              },
            ]}
            onPress={() => onEdit(selectedTx)}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={colors.info}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            s.selectionBtn,
            {
              backgroundColor: withAlpha(colors.expenseSoft, 0.85),
              borderColor: colors.expense,
            },
          ]}
          onPress={onDeleteSelected}
        >
          <MaterialCommunityIcons
            name="trash-can"
            size={18}
            color={colors.expense}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});
