import { memo, useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { statCardStyles as styles } from "@/components/ui/StatCard.styles";
import { type Palette } from "@/theme/colors";
import { type MaterialIconName } from "@/types";
import { Text } from "./AppText";
import { RADIUS } from "@/theme/radii";

const BUBBLE_W = 170;
const H_MARGIN = 10;

export const Kpi = memo(function Kpi({ title, value, icon, color, colors, tooltip }: { title: string; value: string; icon: MaterialIconName; color: string; colors: Palette; tooltip?: string }) {
  const iconRef = useRef<View>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const screenW = useMemo(() => Dimensions.get("window").width, []);
  const popupLeft = tooltipPos ? Math.max(H_MARGIN, Math.min(tooltipPos.x, screenW - BUBBLE_W - H_MARGIN)) : 0;
  return (
    <>
    <View style={[styles.kpi, { backgroundColor: colors.card }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
          <Text numberOfLines={1} style={[styles.statLabel, { color: colors.muted, flexShrink: 1 }]}>{title}</Text>
          {tooltip && (
            <Pressable hitSlop={6} onPress={() => {
              if (tooltipPos) { setTooltipPos(null); return; }
              iconRef.current?.measureInWindow((x, y, _w, h) => {
                setTooltipPos({ x, y: y + h + 4 });
              });
            }}>
              <View ref={iconRef} collapsable={false}>
                <MaterialCommunityIcons name="information-outline" size={13} color={colors.muted} />
              </View>
            </Pressable>
          )}
        </View>
        <MaterialCommunityIcons name={icon} size={18} color={color} style={{ opacity: 0.7 }} />
      </View>
      <Text numberOfLines={1} style={[styles.kpiValue, { color, fontVariant: ["tabular-nums"] }]}>{value}</Text>
    </View>
    {tooltipPos && (
      <Modal visible transparent animationType="none" onRequestClose={() => setTooltipPos(null)}>
        <Pressable style={{ flex: 1 }} onPress={() => setTooltipPos(null)}>
          <View
            onStartShouldSetResponder={() => true}
            style={{
              position: "absolute", left: popupLeft, top: tooltipPos.y,
              width: BUBBLE_W, borderRadius: RADIUS.lg, padding: 10,
              backgroundColor: colors.card,
              shadowColor: colors.shadow, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.text, fontWeight: "400" }}>
              {tooltip}
            </Text>
          </View>
        </Pressable>
      </Modal>
    )}
    </>
  );
});
