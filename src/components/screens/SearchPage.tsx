import { ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Field } from "../ui/Field";
import { ActionRow } from "../ui/ActionRow";
import { Palette } from "../../theme/colors";
import { SearchFilters } from "../../types";

export function SearchPage({ colors, filters, setFilters, onSubmit, onClear }: {
  colors: Palette; filters: SearchFilters; setFilters: (f: SearchFilters) => void;
  onSubmit: () => void; onClear: () => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageScroll, styles.pageScrollMobile]}>
      <View style={[styles.pagePanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.pagePanelHeader}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
          <Text style={[styles.pagePanelTitle, { color: colors.text }]}>Búsqueda avanzada</Text>
        </View>
        <Field label="Descripción / Detalle" value={filters.text} onChangeText={(text: string) => setFilters({ ...filters, text })} colors={colors} />
        <View style={styles.twoCols}>
          <Field label="Monto mínimo" value={filters.minAmount} onChangeText={(minAmount: string) => setFilters({ ...filters, minAmount })} colors={colors} />
          <Field label="Monto máximo" value={filters.maxAmount} onChangeText={(maxAmount: string) => setFilters({ ...filters, maxAmount })} colors={colors} />
        </View>
        <View style={styles.twoCols}>
          <Field label="Desde" value={filters.startDate} onChangeText={(startDate: string) => setFilters({ ...filters, startDate })} colors={colors} placeholder="YYYY-MM-DD" />
          <Field label="Hasta" value={filters.endDate} onChangeText={(endDate: string) => setFilters({ ...filters, endDate })} colors={colors} placeholder="YYYY-MM-DD" />
        </View>
        <ActionRow colors={colors} onCancel={onClear} onSubmit={onSubmit} submitLabel="Buscar" cancelLabel="Limpiar" />
      </View>
    </ScrollView>
  );
}
