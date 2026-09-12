import { memo, useMemo, useCallback, useLayoutEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { bottomNavStyles } from "@/components/layout/BottomNav.styles";
import { useColors, useTheme } from "@/theme/ThemeContext";
import { ANIM_TAB_PAGER } from "@/theme/constants";

const styles = { ...base, ...bottomNavStyles };
import { type Tab, type MaterialIconName } from "@/types";
import { type UiCopy } from "@/i18n";
import { withAlpha } from "@/utils/helpers";
import { Text } from "@/components/ui/AppText";
import { RADIUS } from "@/theme/radii";

function usePressAnimation(durationIn = 70, durationOut = 110) {
  const pressedRef = useRef<Animated.Value | null>(null);
  if (!pressedRef.current) pressedRef.current = new Animated.Value(0);
  const pressed = pressedRef.current;
  const onPressIn = useCallback(() => {
    Animated.timing(pressed, {
      toValue: 1,
      duration: durationIn,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pressed, durationIn]);
  const onPressOut = useCallback(() => {
    Animated.timing(pressed, {
      toValue: 0,
      duration: durationOut,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pressed, durationOut]);
  return { pressed, onPressIn, onPressOut };
}

export const BottomNav = memo(function BottomNav({
  copy,
  tab,
  setTab,
  onAdd,
}: {
  copy: UiCopy;
  tab: Tab;
  setTab: (tab: Tab) => void;
  onAdd: () => void;
}) {
  const { card, borderStrong } = useColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const glassSurface = useMemo(
    () => withAlpha(card, isDark ? 0.85 : 0.82),
    [isDark, card],
  );
  const borderAlpha = useMemo(
    () => withAlpha(borderStrong, isDark ? 0.26 : 0.54),
    [isDark, borderStrong],
  );
  const selectTab = useCallback(
    (next: Tab) => {
      // Sin guard local: changeTab deduplica por tabRef (vive durante el slide).
      setTab(next);
    },
    [setTab],
  );

  return (
    <View style={styles.bottomNav}>
      <View
        pointerEvents="none"
        style={[
          styles.bottomNavGlass,
          {
            backgroundColor: glassSurface,
            borderColor: borderAlpha,
          },
        ]}
      />
      <View style={styles.bottomNavContent}>
        <BottomNavItem
          active={tab === "dashboard"}
          icon="view-dashboard"
          label={copy.dashboard}
          onPress={() => selectTab("dashboard")}
          testID="tab-dashboard"
        />
        <BottomNavItem
          active={tab === "expenses"}
          icon="view-dashboard-outline"
          label={copy.expenses}
          onPress={() => selectTab("expenses")}
          testID="tab-expenses"
        />
        <BottomAddButton onPress={onAdd} />
        <BottomNavItem
          active={tab === "summary"}
          icon="chart-line"
          label={copy.summary}
          onPress={() => selectTab("summary")}
          testID="tab-summary"
        />
        <BottomNavItem
          active={tab === "settings"}
          icon="cog-outline"
          label={copy.settings}
          onPress={() => selectTab("settings")}
          testID="tab-settings"
        />
      </View>
    </View>
  );
});

const BottomNavItem = memo(function BottomNavItem({
  active,
  optimisticActive = true,
  icon,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  optimisticActive?: boolean;
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { primary, primarySoft, muted, text } = useColors();
  const { pressed, onPressIn, onPressOut } = usePressAnimation();
  const localActiveRef = useRef<Animated.Value | null>(null);
  if (!localActiveRef.current) localActiveRef.current = new Animated.Value(active ? 1 : 0);
  const localActive = localActiveRef.current;
  const prevActive = useRef(active);
  // Todo lo visual sale de localActive (arranca optimista al presionar y
  // persigue el slide de 210ms): crossfade nativo, sin snaps de color.
  const inactiveOpacity = localActive.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  useLayoutEffect(() => {
    if (active !== prevActive.current) {
      prevActive.current = active;
      localActive.stopAnimation();
      Animated.timing(localActive, {
        toValue: active ? 1 : 0,
        duration: ANIM_TAB_PAGER,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [active, localActive]);

  const handlePress = useCallback(() => {
    localActive.stopAnimation();
    if (optimisticActive) {
      Animated.timing(localActive, {
        toValue: 1,
        duration: ANIM_TAB_PAGER,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    onPress();
  }, [localActive, onPress, optimisticActive]);

  return (
    <Animated.View
      style={{
        flex: 1,
        minWidth: 0,
        opacity: pressed.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.82],
        }),
        transform: [
          {
            scale: pressed.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.97],
            }),
          },
        ],
      }}
    >
      <Pressable
        testID={testID}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.bottomNavItem}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: RADIUS.xl,
            backgroundColor: primarySoft,
            opacity: localActive,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: RADIUS.xl,
            backgroundColor: primarySoft,
            opacity: pressed,
          }}
        />
        <View style={{ width: 21, height: 21 }}>
          <Animated.View pointerEvents="none" style={{ position: "absolute", opacity: inactiveOpacity }}>
            <MaterialCommunityIcons name={icon} size={21} color={muted} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: "absolute", opacity: localActive }}>
            <MaterialCommunityIcons name={icon} size={21} color={primary} />
          </Animated.View>
        </View>
        <View>
          <Text
            numberOfLines={1}
            style={[styles.bottomNavLabel, { color: muted }]}
          >
            {label}
          </Text>
          <Animated.View
            pointerEvents="none"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: localActive }}
          >
            <Text
              numberOfLines={1}
              style={[styles.bottomNavLabel, { color: text }]}
            >
              {label}
            </Text>
          </Animated.View>
        </View>
        <Animated.View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: primary,
            marginTop: -2,
            opacity: localActive,
          }}
        />
      </Pressable>
    </Animated.View>
  );
});

const BottomAddButton = memo(function BottomAddButton({ onPress }: { onPress: () => void }) {
  const { primary, onPrimary } = useColors();
  const { pressed, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View
      style={[
        styles.bottomAddButton,
        {
          backgroundColor: primary,
          opacity: pressed.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.84],
          }),
          transform: [
            { translateY: -16 },
            {
              scale: pressed.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.95],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        testID="add-transaction"
        accessibilityLabel="Add"
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: RADIUS.xl,
        }}
      >
        <MaterialCommunityIcons name="plus" size={31} color={onPrimary} />
      </Pressable>
    </Animated.View>
  );
});
