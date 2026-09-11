import { memo, useEffect, useRef, useState } from "react";
import { Animated, Pressable, View, type LayoutChangeEvent } from "react-native";
import { type Palette } from "@/theme/colors";
import { Text } from "./AppText";
import { RADIUS } from "@/theme/radii";

export type SegmentOption = { key: string; label: string };

export const SegmentedControl = memo(function SegmentedControl({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: SegmentOption[];
  selected: string;
  onSelect: (key: string) => void;
  colors: Palette;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.key === selected));
  const animIndexRef = useRef<Animated.Value | null>(null);
  if (!animIndexRef.current) animIndexRef.current = new Animated.Value(selectedIndex);
  const animIndex = animIndexRef.current;

  useEffect(() => {
    Animated.timing(animIndex, {
      toValue: selectedIndex,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, animIndex]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const n = options.length;
  if (n < 2) return null;

  const segmentW = containerWidth > 0 ? (containerWidth - 6 - (n - 1) * 2) / n : 0;

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: "row",
        backgroundColor: colors.input,
        borderRadius: RADIUS.md,
        padding: 3,
        gap: 2,
      }}
    >
      {segmentW > 0 && (
          <Animated.View
          style={{
            // ponytail: left matches container padding (absolute starts at border box)
            position: "absolute",
            top: 3,
            bottom: 3,
            left: 3,
            width: segmentW,
            backgroundColor: colors.card,
            borderRadius: RADIUS.sm,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            elevation: 1,
            transform: [{
              translateX: animIndex.interpolate({
                inputRange: Array.from({ length: n }, (_, i) => i),
                outputRange: Array.from({ length: n }, (_, i) => i * (segmentW + 2)),
              }),
            }],
          }}
        />
      )}
      {options.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => onSelect(option.key)}
          style={{
            flex: 1,
            paddingVertical: 7,
            paddingHorizontal: 4,
            borderRadius: RADIUS.sm,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: selected === option.key ? colors.text : colors.muted,
              fontSize: 12,
              fontWeight: selected === option.key ? "700" : "500",
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});
