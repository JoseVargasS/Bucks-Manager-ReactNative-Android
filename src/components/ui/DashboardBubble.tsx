import { memo, useMemo } from "react";
import { Animated, Dimensions, Modal, Pressable, type ViewStyle } from "react-native";
import { type Palette } from "@/theme/colors";

type DashboardBubbleProps = {
  visible: boolean;
  frame: { x: number; y: number; width: number; height: number };
  children: React.ReactNode;
  containerStyle: ViewStyle | Record<string, unknown> | undefined;
  panelStyle: ViewStyle | Record<string, unknown> | undefined;
  colors: Palette;
  onClose: () => void;
};

const POPUP_WIDTH = 230;
const H_MARGIN = 10;

export const DashboardBubble = memo(function DashboardBubble({
  visible, frame, children,
  containerStyle, panelStyle, colors, onClose,
}: DashboardBubbleProps) {
  const screenWidth = useMemo(() => Dimensions.get("window").width, []);
  const popupLeft = useMemo(() => {
    const cx = frame.x + frame.width / 2 - POPUP_WIDTH / 2;
    return Math.max(H_MARGIN, Math.min(cx, screenWidth - POPUP_WIDTH - H_MARGIN));
  }, [frame.x, frame.width, screenWidth]);
  const popupTop = frame.y + frame.height + 8;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1 } as ViewStyle, containerStyle]}>
        <Pressable onPress={onClose} style={{ flex: 1 }}>
          <Animated.View
            onStartShouldSetResponder={() => true}
            style={[
              {
                position: "absolute",
                left: popupLeft,
                top: popupTop,
                width: POPUP_WIDTH,
                borderRadius: 14,
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 10,
                padding: 16,
              },
              panelStyle,
            ]}
          >
            {children}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
});
