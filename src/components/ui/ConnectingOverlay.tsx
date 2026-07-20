import { memo, useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { BlurView } from "expo-blur";
import { useColors } from "@/theme/ThemeContext";
import { Text } from "./AppText";

const BAR_WIDTH = 180;
const BAR_CYCLE_MS = 1400;

export type ConnectionStatus = "scanning" | "loading" | "creating" | "merging" | "syncing" | null;

export const ConnectingOverlay = memo(function ConnectingOverlay({
  status,
  copy,
}: {
  status: ConnectionStatus;
  copy: { scanning: string; loading: string; creating: string; merging: string; syncing: string };
}) {
  const { primary, warn, card, text, muted, overlay } = useColors();
  const barAnim = useRef<Animated.Value | null>(null);
  if (!barAnim.current) barAnim.current = new Animated.Value(0);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim.current!, { toValue: 1, duration: BAR_CYCLE_MS / 2, useNativeDriver: false }),
        Animated.timing(barAnim.current!, { toValue: 0, duration: BAR_CYCLE_MS / 2, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const barColor = barAnim.current!.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [primary, warn, primary],
  });

  const message = status ? copy[status] || copy.syncing : "";

  if (!status) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BlurView
        intensity={40}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: overlay,
        }}
      />

      <View
        style={{
          backgroundColor: card,
          borderRadius: 20,
          paddingVertical: 28,
          paddingHorizontal: 32,
          alignItems: "center",
          gap: 20,
          minWidth: 220,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }}
      >
        <Text
          style={{
            color: text,
            fontSize: 15,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {message}
        </Text>

        <View style={{ width: BAR_WIDTH, height: 4, borderRadius: 2, backgroundColor: muted, overflow: "hidden" }}>
          <Animated.View
            style={{
              height: "100%",
              width: BAR_WIDTH * 0.4,
              borderRadius: 2,
              backgroundColor: barColor,
              transform: [
                {
                  translateX: barAnim.current!.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-BAR_WIDTH * 0.2, BAR_WIDTH * 0.8],
                  }),
                },
              ],
            }}
          />
        </View>
      </View>
    </View>
  );
});
