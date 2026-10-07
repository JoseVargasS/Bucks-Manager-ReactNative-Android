import { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text } from "react-native";
import { SPLASH_BG, ERROR_ACCENT, ERROR_TEXT } from "@/theme/constants";
import { T } from "@/theme/typography";
import { UI_COPY } from "@/i18n";
import { detectDeviceLanguage } from "@/utils/helpers";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const C = UI_COPY[detectDeviceLanguage()];
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: SPLASH_BG }}>
        <Text style={[{ color: ERROR_ACCENT }, T.amountHero]}>{C.errorTitle}</Text>
        <Text style={[{ color: ERROR_TEXT, marginTop: 16, textAlign: "center" }, T.body]}>{C.errorMessage}</Text>
      </View>
    );
  }
}

type FeatureBoundaryProps = { children: ReactNode; featureName: string };
type FeatureBoundaryState = { error: Error | null };

export class FeatureBoundary extends Component<FeatureBoundaryProps, FeatureBoundaryState> {
  state: FeatureBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FeatureBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[FeatureBoundary:${this.props.featureName}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const C = UI_COPY[detectDeviceLanguage()];
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={[{ color: ERROR_ACCENT }, T.section, { fontWeight: "600" as const }]}>{C.errorTitle}</Text>
        <Text style={[{ color: ERROR_TEXT, marginTop: 8, textAlign: "center" }, T.label]}>{C.errorMessage}</Text>
      </View>
    );
  }
}
