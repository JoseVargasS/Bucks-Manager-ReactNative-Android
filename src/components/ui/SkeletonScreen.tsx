import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";

export function SkeletonScreen({ colors }: { colors: Palette }) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.skeletonScreen, { opacity: pulse }]}>
      <View style={[styles.skeletonHeader, { backgroundColor: colors.card }]}>
        <View style={[styles.skeletonBox, { width: 42, height: 42, borderRadius: 8, backgroundColor: colors.input }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[styles.skeletonBox, { width: "58%", height: 18, backgroundColor: colors.input }]} />
          <View style={[styles.skeletonBox, { width: "34%", height: 12, backgroundColor: colors.input }]} />
        </View>
      </View>
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.card }]}>
            <View style={[styles.skeletonBox, { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.input }]} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[styles.skeletonBox, { width: "50%", height: 10, backgroundColor: colors.input }]} />
              <View style={[styles.skeletonBox, { width: "78%", height: 16, backgroundColor: colors.input }]} />
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.skeletonTable, { backgroundColor: colors.card }]}>
        {[0, 1, 2, 3, 4, 5].map((item) => <View key={item} style={[styles.skeletonRow, { backgroundColor: colors.input }]} />)}
      </View>
    </Animated.View>
  );
}
