import { memo, useCallback, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useColors } from "@/theme/ThemeContext";
import { Text } from "./AppText";
import { RADIUS } from "@/theme/radii";

// Azul Google fijo: el pulso en loop despertaba el hilo JS en cada frame
// por un adorno. Calma visual y bateria a cambio de nada funcional.
const GOOGLE_BLUE = "#4285F4";

const GoogleIcon = memo(function GoogleIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
});

export const ConnectBanner = memo(function ConnectBanner({
  onPress,
  copy,
}: {
  onPress: () => void;
  copy: { connectBanner: string };
}) {
  const { card, shadow } = useColors();
  const [dismissed, setDismissed] = useState(false);
  const fabOpacity = useRef<Animated.Value | null>(null);
  if (!fabOpacity.current) fabOpacity.current = new Animated.Value(1);

  const handleClose = useCallback(() => {
    Animated.timing(fabOpacity.current!, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDismissed(true));
  }, []);

  if (dismissed) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 96,
        right: 16,
        zIndex: 30,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: fabOpacity.current!,
      }}
    >
      <Pressable onPress={onPress}>
        <Animated.View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: RADIUS["2xl"],
            backgroundColor: GOOGLE_BLUE,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {copy.connectBanner}
          </Text>
        </Animated.View>
      </Pressable>

      <Animated.View
        style={{
          width: 62,
          height: 62,
          borderRadius: RADIUS.pill,
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
          shadowColor: shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: RADIUS.pill,
            borderWidth: 1,
            borderColor: GOOGLE_BLUE,
          }}
          pointerEvents="none"
        />
        <Pressable
          onPress={onPress}
          style={{
            width: 54,
            height: 54,
            borderRadius: RADIUS.pill,
            backgroundColor: card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GoogleIcon size={26} />
        </Pressable>

        <Pressable
          onPress={handleClose}
          hitSlop={8}
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 22,
            height: 22,
            borderRadius: RADIUS.lg,
            backgroundColor: "#333",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: card,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700", lineHeight: 12 }}>
            ✕
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});
