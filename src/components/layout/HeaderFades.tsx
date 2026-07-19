import { memo, useRef } from "react";
import { Animated, Easing, Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from "react-native-svg";
import { appShellStyles } from "@/components/AppShell.styles";
import { ANIM_HEADER_BTN_IN, ANIM_HEADER_BTN_OUT } from "@/theme/constants";
import { type MaterialIconName } from "@/types";

export const HeaderActionButton = memo(function HeaderActionButton({
  icon,
  iconColor,
  onPress,
}: {
  icon: MaterialIconName;
  iconColor: string;
  onPress: () => void;
}) {
  const pressedRef = useRef<Animated.Value | null>(null);
  if (!pressedRef.current) pressedRef.current = new Animated.Value(0);
  const pressed = pressedRef.current;
  const animate = (toValue: number, duration: number) => {
    pressed.stopAnimation();
    Animated.timing(pressed, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  return (
    <Animated.View
      style={{
        opacity: pressed.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.8],
        }),
        transform: [
          {
            scale: pressed.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.94],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPressIn={() => {
          animate(1, ANIM_HEADER_BTN_IN);
          onPress();
        }}
        onPressOut={() => animate(0, ANIM_HEADER_BTN_OUT)}
        accessibilityRole="button"
        hitSlop={6}
        style={appShellStyles.headerActionBtn}
      >
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </Pressable>
    </Animated.View>
  );
});

export const HeaderFade = memo(function HeaderFade({
  color,
  height,
}: {
  color: string;
  height: number;
}) {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height={height}
      style={{ position: "absolute", top: 0, left: 0, right: 0 }}
    >
      <Defs>
        <LinearGradient id="headerFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="0.38" stopColor={color} stopOpacity="0.85" />
          <Stop offset="0.72" stopColor={color} stopOpacity="0.55" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#headerFade)" />
    </Svg>
  );
});

export const HeaderTitleFade = memo(function HeaderTitleFade({
  color,
}: {
  color: string;
}) {
  return (
    <Svg
      pointerEvents="none"
      width="92%"
      height={70}
      style={appShellStyles.headerTitleFade}
    >
      <Defs>
        <LinearGradient
          id="headerTitleFadeHorizontal"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <Stop offset="0" stopColor={color} stopOpacity="0.85" />
          <Stop offset="0.58" stopColor={color} stopOpacity="0.80" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient
          id="headerTitleFadeVertical"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="0.18" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="0.82" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
        <Mask id="headerTitleFadeMask">
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#headerTitleFadeVertical)"
          />
        </Mask>
      </Defs>
      <Rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="url(#headerTitleFadeHorizontal)"
        mask="url(#headerTitleFadeMask)"
      />
    </Svg>
  );
});
