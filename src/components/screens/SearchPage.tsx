import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Field } from "../ui/Field";
import { Palette } from "../../theme/colors";
import { SearchFilters } from "../../types";
import { UiCopy } from "../../i18n";

export function SearchPage({ colors, copy, currencySymbol, filters, setFilters, onSubmit, onClear }: {
  colors: Palette; copy: UiCopy; currencySymbol: string; filters: SearchFilters; setFilters: (f: SearchFilters) => void;
  onSubmit: () => void; onClear: () => void;
}) {
  return (
    <View style={styles.searchBody}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.searchScrollContent}>
        <View style={[styles.searchSection, { backgroundColor: colors.input }]}>
          <View style={styles.searchSectionHeader}>
            <MaterialCommunityIcons name="text-search" size={18} color={colors.primary} />
            <Text style={[styles.searchSectionTitle, { color: colors.text }]}>{copy.detail}</Text>
          </View>
          <Field
            label={copy.descriptionDetail}
            value={filters.text}
            onChangeText={(text: string) => setFilters({ ...filters, text })}
            colors={colors}
            placeholder={copy.descriptionPlaceholder}
            rightIcon="text"
          />
        </View>

        <View style={[styles.searchSection, { backgroundColor: colors.input }]}>
          <View style={styles.searchSectionHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color={colors.primary} />
            <Text style={[styles.searchSectionTitle, { color: colors.text }]}>{copy.amount}</Text>
          </View>
          <View style={styles.searchFieldGrid}>
            <Field
              label={copy.minAmount}
              value={filters.minAmount}
              onChangeText={(minAmount: string) => setFilters({ ...filters, minAmount })}
              colors={colors}
              placeholder={`${currencySymbol} 0`}
              rightIcon="cash-minus"
            />
            <Field
              label={copy.maxAmount}
              value={filters.maxAmount}
              onChangeText={(maxAmount: string) => setFilters({ ...filters, maxAmount })}
              colors={colors}
              placeholder={`${currencySymbol} 500`}
              rightIcon="cash-plus"
            />
          </View>
        </View>

        <View style={[styles.searchSection, { backgroundColor: colors.input }]}>
          <View style={styles.searchSectionHeader}>
            <MaterialCommunityIcons name="calendar-range" size={18} color={colors.primary} />
            <Text style={[styles.searchSectionTitle, { color: colors.text }]}>{copy.dates}</Text>
          </View>
          <View style={styles.searchFieldGrid}>
            <Field
              label={copy.from}
              value={filters.startDate}
              onChangeText={(startDate: string) => setFilters({ ...filters, startDate })}
              colors={colors}
              placeholder="YYYY-MM-DD"
              rightIcon="calendar-start"
            />
            <Field
              label={copy.to}
              value={filters.endDate}
              onChangeText={(endDate: string) => setFilters({ ...filters, endDate })}
              colors={colors}
              placeholder="YYYY-MM-DD"
              rightIcon="calendar-end"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.searchActions, { borderColor: colors.border }]}>
        <TouchableOpacity style={[styles.searchActionBtn, { backgroundColor: colors.input, borderColor: colors.border }]} onPress={onClear}>
          <MaterialCommunityIcons name="filter-remove-outline" size={19} color={colors.text} />
          <Text style={[styles.searchActionText, { color: colors.text }]}>{copy.clear}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.searchActionBtn, styles.searchActionPrimary, { backgroundColor: colors.primary }]} onPress={onSubmit}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.onPrimary} />
          <Text style={[styles.searchActionText, { color: colors.onPrimary }]}>{copy.search}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
