import { memo } from "react";
import { Animated, Image, View } from "react-native";
import { BlurView } from "expo-blur";
import { appShellStyles } from "@/components/AppShell.styles";
import { type Palette } from "@/theme/colors";
import { type Tab } from "@/types";
import { type UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";
import { HeaderActionButton, HeaderFade, HeaderTitleFade } from "@/components/layout/HeaderFades";
import { BLUR_INTENSITY } from "@/theme/constants";

type HeaderShellProps = {
  tab: Tab;
  bg: string;
  isDark: boolean;
  headerTopInset: number;
  headerFadeHeight: number;
  historyTint: string;
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onOpenSearch: () => void;
  copy: UiCopy;
};

function HeaderShellImpl(
  props: HeaderShellProps & {
    colors: Palette;
  },
) {
  const {
    tab,
    bg,
    isDark,
    headerTopInset,
    headerFadeHeight,
    historyTint,
    onToggleTheme,
    onOpenHistory,
    onOpenSearch,
    copy,
    colors,
  } = props;
  const pageTitle =
    tab === "dashboard"
      ? copy.dashboard
      : tab === "expenses"
        ? copy.expenses
        : tab === "summary"
          ? copy.summary
          : copy.settings;
  const pageSubtitle =
    tab === "dashboard"
      ? copy.dashboardSubtitle
      : tab === "summary"
        ? copy.summarySubtitle
        : copy.settingsSubtitle;
  const showHeaderFade = tab === "dashboard" || tab === "expenses" || tab === "summary";
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
      }}
      pointerEvents="box-none"
    >
      {showHeaderFade && <HeaderFade color={bg} height={headerFadeHeight} />}
      <View pointerEvents="box-none" style={{ paddingTop: headerTopInset }}>
        <View
          style={[
            appShellStyles.topBar,
            appShellStyles.topBarMobile,
            { backgroundColor: "transparent" },
          ]}
        >
          <HeaderTitleFade color={bg} />
          <View style={appShellStyles.headerLeft}>
            <View style={appShellStyles.headerLogo}>
              <Image
                source={require("../../../assets/icon-bucks.png")}
                style={{ width: 40, height: 40, borderRadius: 10 }}
                resizeMode="cover"
              />
            </View>
            <View style={appShellStyles.titleBlock}>
              <Text
                numberOfLines={1}
                style={[
                  appShellStyles.pageTitle,
                  appShellStyles.pageTitleMobile,
                  isDark
                    ? appShellStyles.headerReadableTextDark
                    : appShellStyles.headerReadableTextLight,
                  { color: colors.text, textShadowColor: colors.shadow },
                ]}
              >
                {pageTitle}
              </Text>
              {!!pageSubtitle && (
                <Text
                  numberOfLines={1}
                  style={[
                    appShellStyles.pageSub,
                    appShellStyles.pageSubMobile,
                    isDark
                      ? appShellStyles.headerReadableTextDark
                      : appShellStyles.headerReadableTextLight,
                    { color: colors.muted, textShadowColor: colors.shadow },
                  ]}
                >
                  {pageSubtitle}
                </Text>
              )}
            </View>
          </View>
          <BlurView intensity={BLUR_INTENSITY} tint={isDark ? "dark" : "light"} style={appShellStyles.headerActionsGroup}>
            <HeaderActionButton
              icon={isDark ? "weather-night" : "white-balance-sunny"}
              iconColor={colors.warn}
              onPress={onToggleTheme}
            />
            <HeaderActionButton
              icon="magnify"
              iconColor={colors.primary}
              onPress={onOpenSearch}
            />
            <HeaderActionButton
              icon="history"
              iconColor={historyTint}
              onPress={onOpenHistory}
            />
          </BlurView>
        </View>
      </View>
    </Animated.View>
  );
}

export const HeaderShell = memo(HeaderShellImpl);
