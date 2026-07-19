import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  useWindowDimensions,
  StatusBar as NativeStatusBar,
} from "react-native";
import { ANIM_TAB_PAGER, TAB_ORDER } from "@/theme/constants";
import type { Tab } from "@/types";

export function useTabNavigation() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabRef = useRef<Tab>(tab);
  const pagerRef = useRef<Animated.Value | null>(null);
  if (!pagerRef.current) pagerRef.current = new Animated.Value(0);
  const pagerTranslateX = pagerRef.current;
  const { width: tabWidth } = useWindowDimensions();
  const statusBarInset = NativeStatusBar.currentHeight || 0;
  const headerTopInset = statusBarInset + 6;
  const headerFadeHeight = Math.max(headerTopInset + 28, 56);

  const changeTab = useCallback(
    (next: Tab) => {
      if (next === tabRef.current) return;
      tabRef.current = next;
      pagerTranslateX.stopAnimation();
      Animated.timing(pagerTranslateX, {
        toValue: -TAB_ORDER.indexOf(next) * tabWidth,
        duration: ANIM_TAB_PAGER,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && tabRef.current === next) setTab(next);
      });
    },
    [pagerTranslateX, tabWidth],
  );

  const lastTabWidthRef = useRef(tabWidth);
  useEffect(() => {
    if (lastTabWidthRef.current === tabWidth) return;
    lastTabWidthRef.current = tabWidth;
    pagerTranslateX.stopAnimation();
    pagerTranslateX.setValue(-TAB_ORDER.indexOf(tabRef.current) * tabWidth);
  }, [pagerTranslateX, tabWidth]);

  return {
    tab,
    setTab,
    tabRef,
    pagerTranslateX,
    tabWidth,
    statusBarInset,
    headerTopInset,
    headerFadeHeight,
    changeTab,
  };
}
