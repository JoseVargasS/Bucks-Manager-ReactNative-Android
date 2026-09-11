import { memo, useEffect, useRef } from "react";
import { Animated, Easing, ScrollView, Pressable, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { settingsStyles } from "@/components/screens/SettingsView.styles";

const styles = { ...base, ...settingsStyles };
import { type Palette } from "@/theme/colors";
import { type FontPreference, type MaterialIconName } from "@/types";
import { type UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";
import { RADIUS } from "@/theme/radii";
import { T } from "@/theme/typography";
// font size selector handled via SettingsView props; levels defined in fontConstants

export const SettingsView = memo(function SettingsView({
  colors, copy, accountInfo, language, currencySymbol, fontPreference, fontSizeScale, pinEnabled,
  colorSchemeLabel, tagsCount,
  onOpenLanguage, onOpenCurrency, onOpenFont, onOpenFontSize, onOpenColorScheme, onOpenPin, onOpenTags,
  onSwitch, onDisconnect, onOpenExport,
}: {
  colors: Palette; copy: UiCopy;
  language: "es" | "en"; currencySymbol: string; fontPreference: FontPreference; fontSizeScale: number;
  colorSchemeLabel: string;
  accountInfo: { name?: string; email?: string } | null;
  pinEnabled: boolean; tagsCount: number;
  onOpenLanguage: () => void; onOpenCurrency: () => void; onOpenFont: () => void; onOpenFontSize: () => void;
  onOpenColorScheme: () => void;
  onOpenPin: () => void; onOpenTags: () => void;
  onSwitch: () => void; onDisconnect: () => void; onOpenExport: () => void;
}) {
  const initial = (accountInfo?.email || accountInfo?.name || "B").slice(0, 1).toUpperCase();
  const fontLabel: Record<FontPreference, string> = {
    dmsans: copy.system,
    serif: copy.serif,
    condensed: copy.condensed,
    light: copy.lightFont,
    casual: copy.casual,
    smallcaps: copy.smallCaps,
    inter: copy.inter,
    fredoka: copy.fredoka,
    comicneue: copy.comicNeue,
    sora: copy.sora,
    patrickhand: copy.patrickHand,
    plusjakartasans: copy.plusJakartaSans,
    intervariable: copy.interVariable,
    comicsansms: copy.comicSansMS,
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageScroll, styles.pageScrollMobile]}>
      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>{copy.account}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <View style={[styles.settingsRow, { borderBottomWidth: 0.5, borderColor: colors.border }]}>
            <View style={[styles.settingsAvatar, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.accountInitial, { color: colors.primary }]}>{initial}</Text>
            </View>
            <View style={styles.settingsRowText}>
              <Text numberOfLines={1} style={[styles.accountHeroName, { color: colors.text }]}>{accountInfo?.name || copy.connectedAccount}</Text>
              <Text numberOfLines={1} style={[styles.accountHeroEmail, { color: colors.muted }]}>{accountInfo?.email || copy.google}</Text>
            </View>
          </View>
          <SettingsRow colors={colors} icon="account-switch" label={copy.manageAccounts} onPress={onSwitch} last />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>{copy.preferences}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <SettingsRow colors={colors} icon="translate" label={copy.language} value={language === "es" ? copy.spanish : copy.english} onPress={onOpenLanguage} />
          <SettingsRow colors={colors} icon="currency-usd" label={copy.currencySymbol} value={currencySymbol} onPress={onOpenCurrency} />
          <SettingsRow colors={colors} icon="format-font" label={copy.fontStyle} value={fontLabel[fontPreference]} onPress={onOpenFont} />
          <SettingsRow colors={colors} icon="format-size" label={copy.fontSize} value={String(fontSizeScale)} onPress={onOpenFontSize} />
          <SettingsRow colors={colors} icon="palette-outline" label={copy.colorPalette} value={colorSchemeLabel} tone={colors.primary} onPress={onOpenColorScheme} last />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>{copy.security}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <View style={[styles.settingsRow, { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <MaterialCommunityIcons name="shield-lock" size={22} color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{copy.pinApp}</Text>
              <Text style={[{ color: colors.muted, marginTop: 1 }, T.caption]}>{copy.pinAppSub}</Text>
            </View>
            <SmoothSwitch value={pinEnabled} onValueChange={onOpenPin} colors={colors} />
          </View>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>{copy.tagsTitle}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <SettingsRow colors={colors} icon="tag-multiple" label={copy.tagsTitle} value={String(tagsCount)} onPress={onOpenTags} last />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>{copy.export}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <SettingsRow colors={colors} icon="file-export" label={copy.exportMovements} onPress={onOpenExport} last />
        </View>
      </View>

      <Pressable style={styles.signOutBtn} onPress={onDisconnect}>
        <Text style={[styles.signOutText, { color: colors.expense }]}>{copy.signOut}</Text>
      </Pressable>
    </ScrollView>
  );
});

function SmoothSwitch({ value, onValueChange, colors }: { value: boolean; onValueChange: (v: boolean) => void; colors: Palette }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(anim, {
        toValue: value ? 1 : 0,
        tension: 34,
        friction: 7,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(thumbScale, { toValue: 0.88, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.spring(thumbScale, { tension: 320, friction: 7, toValue: 1, useNativeDriver: false }),
      ]),
    ]).start();
  }, [value, anim, thumbScale]);

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.switchTrack, colors.primary],
  });
  const trackBorder = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });
  const thumbBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ffffff", colors.onPrimary],
  });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const trackOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={{ paddingVertical: 4 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={{
          width: 44,
          height: 26,
          borderRadius: RADIUS.pill,
          backgroundColor: trackBg as unknown as string,
          borderWidth: 1,
          borderColor: trackBorder as unknown as string,
          opacity: trackOpacity as unknown as number,
          justifyContent: "center",
          padding: 2,
        }}
      >
        <Animated.View
          style={{
            width: 22,
            height: 22,
            borderRadius: RADIUS.pill,
            backgroundColor: thumbBg as unknown as string,
            transform: [{ translateX }, { scale: thumbScale }],
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.22,
            shadowRadius: 1.5,
            elevation: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View style={{ opacity: anim as unknown as number }}>
            <MaterialCommunityIcons
              name="check"
              size={13}
              color={colors.primary}
              style={{ opacity: value ? 1 : 0 }}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function SettingsRow({ colors, icon, label, value, tone, onPress, last = false }: {
  colors: Palette; icon: MaterialIconName;
  label: string; value?: string; tone?: string; onPress: () => void; last?: boolean;
}) {
  return (
    <Pressable style={[styles.settingsRow, !last && { borderBottomWidth: 0.5, borderColor: colors.border }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={22} color={tone || colors.info} />
      <Text style={[styles.settingsRowLabel, { color: colors.text }]}>{label}</Text>
      {value !== undefined && <Text numberOfLines={1} style={[styles.settingsRowValue, { color: colors.muted }]}>{value}</Text>}
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}
