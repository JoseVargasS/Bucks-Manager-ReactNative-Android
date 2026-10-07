import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { ANIM_MODAL_CONTENT } from "@/theme/constants";

export function useModalTransition(visible: boolean, offset = 16, scaleFrom = 1, onClosed?: () => void) {
  const [mounted, setMounted] = useState(visible);
  const progressRef = useRef<Animated.Value | null>(null);
  if (!progressRef.current) progressRef.current = new Animated.Value(visible ? 1 : 0);
  const progress = progressRef.current;
  const contentRef = useRef<Animated.Value | null>(null);
  if (!contentRef.current) contentRef.current = new Animated.Value(visible ? 1 : 0);
  const content = contentRef.current;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  useLayoutEffect(() => {
    progress.stopAnimation();
    content.stopAnimation();
    if (!visible && !mounted) return;
    if (visible) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 160 : 120,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    // Inner content rides along but lands later (220ms, 10px rise) so it
    // reads as polish after the panel settles. Starts with the panel —
    // touch response is never delayed.
    const contentAnimation = Animated.timing(content, {
      toValue: visible ? 1 : 0,
      duration: visible ? ANIM_MODAL_CONTENT : 120,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    if (visible) {
      animation.start();
      contentAnimation.start();
    } else {
      animation.start(({ finished }) => {
        if (!finished) return;
        setMounted(false);
        onClosedRef.current?.();
      });
      contentAnimation.start();
    }
    return () => {
      animation.stop();
      contentAnimation.stop();
    };
  }, [mounted, progress, content, visible]);

  return {
    modalVisible: visible || mounted,
    containerStyle: { opacity: progress },
    panelStyle: {
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }) },
      ],
    },
    // Nest inside the panel, not around it.
    contentStyle: {
      opacity: content,
      transform: [
        { translateY: content.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      ],
    },
  };
}

