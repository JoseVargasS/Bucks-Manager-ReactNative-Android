import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { SPLASH_BG, SPLASH_TEXT } from "@/theme/constants";

const ICON_SIZE = 160;
const EXIT_DURATION = 220;

type Props = {
  exiting?: boolean;
  onExitComplete?: () => void;
};

export function StartupSplash({ exiting = false, onExitComplete }: Props) {
  const icon = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const iconIn = Animated.timing(icon, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const textIn = Animated.timing(text, {
      toValue: 1,
      duration: 350,
      delay: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    iconIn.start();
    textIn.start();
    return () => {
      iconIn.stop();
      textIn.stop();
    };
  }, [icon, text]);

  useEffect(() => {
    if (!exiting) return;
    icon.stopAnimation();
    text.stopAnimation();
    Animated.parallel([
      Animated.timing(icon, {
        toValue: 0,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(text, {
        toValue: 0,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onExitComplete?.();
    });
  }, [exiting, icon, text, onExitComplete]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: SPLASH_BG,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.Image
        source={require("../../../assets/splash-icon-bucks.png")}
        resizeMode="contain"
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          opacity: icon,
          transform: [
            { scale: icon.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ],
        }}
      />
      <Animated.Text
        style={{
          marginTop: 20,
          color: SPLASH_TEXT,
          fontFamily: "DMSans",
          fontWeight: "600",
          fontSize: 24,
          opacity: text,
          transform: [
            { translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        }}
      >
        Bucks Manager
      </Animated.Text>
    </View>
  );
}
