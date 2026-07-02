import { memo } from "react";
import { Animated, Modal, TouchableOpacity, View, type ViewStyle } from "react-native";
import { tagTextColor } from "@/utils/tags";
import { type Palette } from "@/theme/colors";
import { Text } from "@/components/ui/AppText";

export type TagBubble = { x: number; y: number; tags: string[] };

type TagBubbleProps = {
  data: TagBubble;
  visible: boolean;
  containerStyle: ViewStyle | undefined;
  panelStyle: ViewStyle | undefined;
  tagColorMap: Record<string, string>;
  tagLabelMap: Record<string, string>;
  colors: Palette;
  onClose: () => void;
};

export const TagBubblePopup = memo(function TagBubblePopup({
  data,
  visible,
  containerStyle,
  panelStyle,
  tagColorMap,
  tagLabelMap,
  colors,
  onClose,
}: TagBubbleProps) {
  return (
    visible && (
      <Modal
        visible
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <Animated.View style={[{ flex: 1 }, containerStyle]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={onClose}
            style={{ flex: 1 }}
          >
            <Animated.View
              onStartShouldSetResponder={() => true}
              style={[
                {
                  position: "absolute",
                  left: data.x,
                  top: data.y,
                  maxWidth: 170,
                  borderRadius: 12,
                  padding: 8,
                  backgroundColor: colors.card,
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.22,
                  shadowRadius: 12,
                  elevation: 8,
                },
                panelStyle,
              ]}
            >
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
              >
                {data.tags.map((tag) => {
                  const tc = tagColorMap[tag] || colors.muted;
                  const textColor = tagTextColor(tc, colors);
                  const tagLabel = tagLabelMap[tag] || tag;
                  return (
                    <View
                      key={tag}
                      style={{
                        maxWidth: "100%",
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 7,
                        backgroundColor: tc,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: textColor,
                        }}
                      >
                        {tagLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    )
  );
});
