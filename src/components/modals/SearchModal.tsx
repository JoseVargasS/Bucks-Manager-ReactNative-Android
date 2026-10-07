import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, BackHandler, Keyboard, StyleSheet, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { searchModalStyles } from "@/components/modals/SearchModal.styles";

const styles = { ...base, ...searchModalStyles };
import { type Palette } from "@/theme/colors";
import { Z_INDEX_SEARCH } from "@/theme/constants";
import { emptySearchFilters, type SearchFilters, type Tag } from "@/types";
import { SearchPage } from "@/components/screens/SearchPage";
import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { useKeyboardOffset } from "@/components/ui/useKeyboardOffset";
import { Text } from "@/components/ui/AppText";

export type SearchModalHandle = { open: (filters: SearchFilters) => void };

export const SearchModal = forwardRef<SearchModalHandle, {
  colors: Palette; copy: UiCopy; currencySymbol: string; tags: Tag[];
  onClear: () => void; onSubmit: (filters: SearchFilters) => void;
}>(function SearchModal({ colors, copy, currencySymbol, tags, onClear, onSubmit }, ref) {
  const [visible, setVisible] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(emptySearchFilters);
  const kbHeight = useKeyboardOffset(visible);
  const pendingAction = useRef<(() => void) | null>(null);
  const transition = useModalTransition(visible, 24, 1, () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  });
  const close = useCallback(() => {
    Keyboard.dismiss();
    setVisible(false);
  }, []);

  useImperativeHandle(ref, () => ({
    open(filters) {
      setLocalFilters(filters);
      setVisible(true);
    },
  }), []);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, visible]);

  if (!transition.modalVisible) return null;
  return (
      <Animated.View
        pointerEvents={transition.modalVisible ? "auto" : "none"}
        accessibilityViewIsModal={visible}
        importantForAccessibility={transition.modalVisible ? "yes" : "no-hide-descendants"}
        style={[StyleSheet.absoluteFill, styles.searchOverlay, { backgroundColor: colors.overlay, zIndex: Z_INDEX_SEARCH, elevation: Z_INDEX_SEARCH }, transition.containerStyle]}
      >
        <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <Pressable style={styles.optionBackdrop} onPress={close} />
        <Animated.View style={[styles.searchSheet, { backgroundColor: colors.card, paddingBottom: kbHeight }, transition.panelStyle]}>
          <Animated.View style={[transition.contentStyle, { flexShrink: 1 }]}>
          <View style={[styles.searchGrabber, { backgroundColor: colors.border }]} />
          <View style={styles.searchHeader}>
            <View style={[styles.searchHeaderIcon, { backgroundColor: colors.primarySoft }]}>
              <MaterialCommunityIcons name="magnify" size={21} color={colors.primary} />
            </View>
            <View style={styles.searchTitleBlock}>
              <Text style={[styles.searchTitle, { color: colors.text }]}>{copy.advancedSearch}</Text>
              <Text style={[styles.searchSubtitle, { color: colors.muted }]}>{copy.advancedSearchSubtitle}</Text>
            </View>
            <Pressable style={[styles.optionClose, { backgroundColor: colors.input }]} onPress={close}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <SearchPage colors={colors} copy={copy} currencySymbol={currencySymbol} tags={tags} filters={localFilters} setFilters={setLocalFilters} onSubmit={() => { const filters = localFilters; pendingAction.current = () => onSubmit(filters); close(); }} onClear={() => { pendingAction.current = onClear; close(); }} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
  );
});
