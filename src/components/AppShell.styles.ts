import { StyleSheet } from "react-native";
import { NAV_BTN_SIZE, NAV_BTN_HEIGHT, NAV_BTN_RADIUS, NAV_GROUP_GAP, NAV_GROUP_PADDING, NAV_GROUP_RADIUS } from "@/theme/constants";
import { RADIUS } from "@/theme/radii";
import { T } from "@/theme/typography";

export const appShellStyles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topBarMobile: {
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "relative",
  },
  headerTitleFade: { position: "absolute", left: 4, top: -1 },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 1,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, minWidth: 0 },
  headerActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: NAV_GROUP_RADIUS,
    padding: NAV_GROUP_PADDING,
    gap: NAV_GROUP_GAP,
    overflow: "hidden",
  },
  headerActionBtn: {
    width: NAV_BTN_SIZE,
    height: NAV_BTN_HEIGHT,
    borderRadius: NAV_BTN_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: { ...T.pageTitle },
  pageTitleMobile: { fontSize: 21, fontWeight: "700" as const },
  pageSub: { ...T.pageSub },
  pageSubMobile: { ...T.body, fontWeight: "500" as const },
  headerReadableTextDark: {
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  headerReadableTextLight: {
    textShadowOffset: { width: 0, height: 0.25 },
    textShadowRadius: 0.7,
  },
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  loadingOverlay: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    zIndex: 30,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0,
  },
});
