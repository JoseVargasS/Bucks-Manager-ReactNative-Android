import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { SPLASH_BG } from "@/theme/constants";

const EXIT_DURATION = 220;
// ponytail: video 1.78s, fallback 2300ms + playToEnd listener
const VIDEO_FALLBACK_MS = 2300;

type Props = {
  exiting?: boolean;
  onExitComplete?: () => void;
};

export function StartupSplash({ exiting = false, onExitComplete }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [ended, setEnded] = useState(false);

  const player = useVideoPlayer(require("../../../assets/splash.mp4"), (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("playToEnd", () => setEnded(true));
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const t = setTimeout(() => setEnded(true), VIDEO_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  const canExit = exiting && ended;

  useEffect(() => {
    if (!canExit) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onExitComplete?.();
    });
  }, [canExit, opacity, onExitComplete]);

  useEffect(() => {
    if (!canExit) return;
    const t = setTimeout(() => onExitComplete?.(), 600);
    return () => clearTimeout(t);
  }, [canExit, onExitComplete]);

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <View style={styles.videoWrap}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      </View>
    </Animated.View>
  );
}

const VIDEO_W = 260;
const VIDEO_H = (VIDEO_W * 904) / 720;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  videoWrap: {
    width: VIDEO_W,
    height: VIDEO_H,
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: VIDEO_W,
    height: VIDEO_H,
  },
});
