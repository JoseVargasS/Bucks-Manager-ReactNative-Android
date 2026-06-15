import { View } from "react-native";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";

export function SkeletonScreen({ colors }: { colors: Palette }) {
  return (
    <View style={styles.skeletonScreen}>
      <View style={[styles.skeletonHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.skeletonBox, { width: 42, height: 42, borderRadius: 8, backgroundColor: colors.input }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[styles.skeletonBox, { width: "58%", height: 18, backgroundColor: colors.input }]} />
          <View style={[styles.skeletonBox, { width: "34%", height: 12, backgroundColor: colors.input }]} />
        </View>
      </View>
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.skeletonBox, { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.input }]} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[styles.skeletonBox, { width: "50%", height: 10, backgroundColor: colors.input }]} />
              <View style={[styles.skeletonBox, { width: "78%", height: 16, backgroundColor: colors.input }]} />
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.skeletonTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[0, 1, 2, 3, 4, 5].map((item) => <View key={item} style={[styles.skeletonRow, { backgroundColor: colors.input }]} />)}
      </View>
    </View>
  );
}
