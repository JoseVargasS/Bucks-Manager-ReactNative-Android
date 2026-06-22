import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export function useModalTransition(visible: boolean, offset = 16, scaleFrom = 1, onClosed?: () => void) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const onClosedRef = useRef(onClosed);

  useLayoutEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useLayoutEffect(() => {
    progress.stopAnimation();
    if (!visible && !mounted) return;

    if (visible) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 160 : 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const frame = visible
      ? requestAnimationFrame(() => animation.start())
      : undefined;

    if (!visible) {
      animation.start(({ finished }) => {
        if (!finished) return;
        setMounted(false);
        onClosedRef.current?.();
      });
    }

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      animation.stop();
    };
  }, [mounted, progress, visible]);

  return {
    modalVisible: visible || mounted,
    containerStyle: { opacity: progress },
    panelStyle: {
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }) },
      ],
    },
  };
}
