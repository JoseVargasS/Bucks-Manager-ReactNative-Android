import { memo } from "react";

export const BottomFade = memo(function BottomFade({
  color,
  height,
}: {
  color: string;
  height: number;
}) {
  const Svg = require("react-native-svg").default;
  const { Defs, LinearGradient, Rect, Stop } = require("react-native-svg");
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height={height}
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 10 }}
    >
      <Defs>
        <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0" />
          <Stop offset="0.36" stopColor={color} stopOpacity="0.16" />
          <Stop offset="0.70" stopColor={color} stopOpacity="0.58" />
          <Stop offset="1" stopColor={color} stopOpacity="0.86" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomFade)" />
    </Svg>
  );
});
