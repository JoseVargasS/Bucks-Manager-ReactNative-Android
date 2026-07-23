import { memo } from "react";
import { ActivityIndicator, View } from "react-native";
import { appShellStyles } from "@/components/AppShell.styles";
import { type Palette } from "@/theme/colors";
import { type FontPreference, type LanguageMode, type SummaryRow, type Tag, type Transaction } from "@/types";
import { type UiCopy } from "@/i18n";
import { DashboardView } from "@/components/screens/DashboardView";
import { ExpensesView } from "@/components/screens/ExpensesView";
import { SummaryView } from "@/components/screens/SummaryView";
import { SettingsView } from "@/components/screens/SettingsView";
import { Text } from "@/components/ui/AppText";
import { FeatureBoundary } from "@/components/ErrorBoundary";

type ExpensesTabProps = {
  contentTopInset: number;
  colors: Palette;
  theme: "dark" | "light";
  transactions: Transaction[];
  searchActive: boolean;
  searchText: string;
  selectedRows: number[];
  currencySymbol: string;
  copy: UiCopy;
  month: number;
  year: number;
  availableYears: number[];
  availableMonths: number[];
  onExitSearch: () => void;
  onOpenDetail: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDeleteSelected: () => void;
  onMove: (tx: Transaction) => void;
  onToggleSelection: (tx: Transaction) => void;
  onLoadOlder: () => void;
  onSelectPeriod: (month: number, year: number) => void;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  tagsList: Tag[];
};

type SummaryTabProps = {
  contentTopInset: number;
  colors: Palette;
  copy: UiCopy;
  summaries: SummaryRow[];
  transactions: Transaction[];
  freqIncome: Record<string, number>;
  availableYears: number[];
  currencySymbol: string;
  tagsList: Tag[];
  theme: "dark" | "light";
};

type DashboardTabProps = {
  contentTopInset: number;
  colors: Palette;
  theme: "dark" | "light";
  copy: UiCopy;
  allTransactions: Transaction[];
  tagsList: Tag[];
  currencySymbol: string;
  month: number;
  year: number;
  availableYears: number[];
  availableMonths: number[];
  onSelectPeriod: (month: number, year: number) => void;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  onOpenDetail: (tx: Transaction) => void;
};

type SettingsTabProps = {
  contentTopInset: number;
  colors: Palette;
  copy: UiCopy;
  language: LanguageMode;
  accountInfo: { name?: string; email?: string } | null;
  currencySymbol: string;
  fontPreference: FontPreference;
  colorSchemeLabel: string;
  pinEnabled: boolean;
  tagsCount: number;
  onOpenLanguage: () => void;
  onOpenCurrency: () => void;
  onOpenFont: () => void;
  onOpenColorScheme: () => void;
  onOpenPin: () => void;
  onOpenTags: () => void;
  onSwitch: () => void;
  onDisconnect: () => void;
  onOpenExport: () => void;
};

type LoadingBarProps = {
  visible: boolean;
  syncing: boolean;
  cardColor: string;
  primaryColor: string;
  mutedColor: string;
  text: string;
};

export type TabPageProps =
  | {
      tab: "dashboard";
      isCurrent: boolean;
      props: DashboardTabProps;
      loadingBar: LoadingBarProps;
      tabWidth: number;
    }
  | {
      tab: "expenses";
      isCurrent: boolean;
      props: ExpensesTabProps;
      loadingBar: LoadingBarProps;
      tabWidth: number;
    }
  | {
      tab: "summary";
      isCurrent: boolean;
      props: SummaryTabProps;
      loadingBar: LoadingBarProps;
      tabWidth: number;
    }
  | {
      tab: "settings";
      isCurrent: boolean;
      props: SettingsTabProps;
      loadingBar: LoadingBarProps;
      tabWidth: number;
    };

function TabPageImpl(props: TabPageProps) {
  const { tab, isCurrent, props: tabProps, loadingBar, tabWidth } = props;
  const showSettingsTopPad = tab === "settings";
  return (
    <View
      pointerEvents={isCurrent ? "auto" : "none"}
      importantForAccessibility={isCurrent ? "auto" : "no-hide-descendants"}
      style={{ width: tabWidth, height: "100%", position: "relative" }}
    >
      <View
        style={[
          { flex: 1 },
          showSettingsTopPad && { paddingTop: tabProps.contentTopInset },
        ]}
      >
        {loadingBar.visible && (
          <View
            style={[
              appShellStyles.loadingBar,
              appShellStyles.loadingOverlay,
              { backgroundColor: loadingBar.cardColor },
            ]}
          >
            {loadingBar.syncing && (
              <ActivityIndicator color={loadingBar.primaryColor} />
            )}
            <Text style={{ color: loadingBar.mutedColor }}>{loadingBar.text}</Text>
          </View>
        )}
        {tab === "dashboard" ? (
          <FeatureBoundary featureName="dashboard">
            <DashboardView
              colors={tabProps.colors}
              theme={tabProps.theme}
              copy={tabProps.copy}
              allTransactions={tabProps.allTransactions}
              tagsList={tabProps.tagsList}
              currencySymbol={tabProps.currencySymbol}
              month={tabProps.month}
              year={tabProps.year}
              availableYears={tabProps.availableYears}
              availableMonths={tabProps.availableMonths}
              onSelectPeriod={tabProps.onSelectPeriod}
              goToday={tabProps.goToday}
              goPrevMonth={tabProps.goPrevMonth}
              goNextMonth={tabProps.goNextMonth}
              onOpenDetail={tabProps.onOpenDetail}
              topInset={tabProps.contentTopInset}
            />
          </FeatureBoundary>
        ) : tab === "expenses" ? (
          <FeatureBoundary featureName="expenses">
            <ExpensesView
              colors={tabProps.colors}
              theme={tabProps.theme}
              transactions={tabProps.transactions}
              searchActive={tabProps.searchActive}
              searchText={tabProps.searchText}
              selectedRows={tabProps.selectedRows}
              currencySymbol={tabProps.currencySymbol}
              copy={tabProps.copy}
              month={tabProps.month}
              year={tabProps.year}
              availableYears={tabProps.availableYears}
              availableMonths={tabProps.availableMonths}
              onExitSearch={tabProps.onExitSearch}
              onOpenDetail={tabProps.onOpenDetail}
              onEdit={tabProps.onEdit}
              onDeleteSelected={tabProps.onDeleteSelected}
              onMove={tabProps.onMove}
              onToggleSelection={tabProps.onToggleSelection}
              onLoadOlder={tabProps.onLoadOlder}
              onSelectPeriod={tabProps.onSelectPeriod}
              goToday={tabProps.goToday}
              goPrevMonth={tabProps.goPrevMonth}
              goNextMonth={tabProps.goNextMonth}
              topInset={tabProps.contentTopInset}
              tagsList={tabProps.tagsList}
            />
          </FeatureBoundary>
        ) : tab === "summary" ? (
          <FeatureBoundary featureName="summary">
            <SummaryView
              colors={tabProps.colors}
              copy={tabProps.copy}
              summaries={tabProps.summaries}
              transactions={tabProps.transactions}
              freqIncome={tabProps.freqIncome}
              tagsList={tabProps.tagsList}
              availableYears={tabProps.availableYears}
              topInset={tabProps.contentTopInset}
              currencySymbol={tabProps.currencySymbol}
              theme={tabProps.theme}
            />
          </FeatureBoundary>
        ) : (
          <FeatureBoundary featureName="settings">
            <SettingsView
              colors={tabProps.colors}
              copy={tabProps.copy}
              language={tabProps.language}
              accountInfo={tabProps.accountInfo}
              currencySymbol={tabProps.currencySymbol}
              fontPreference={tabProps.fontPreference}
              colorSchemeLabel={tabProps.colorSchemeLabel}
              pinEnabled={tabProps.pinEnabled}
              tagsCount={tabProps.tagsCount}
              onOpenLanguage={tabProps.onOpenLanguage}
              onOpenCurrency={tabProps.onOpenCurrency}
              onOpenFont={tabProps.onOpenFont}
              onOpenColorScheme={tabProps.onOpenColorScheme}
              onOpenPin={tabProps.onOpenPin}
              onOpenTags={tabProps.onOpenTags}
              onSwitch={tabProps.onSwitch}
              onDisconnect={tabProps.onDisconnect}
              onOpenExport={tabProps.onOpenExport}
            />
          </FeatureBoundary>
        )}
      </View>
    </View>
  );
}

export const TabPage = memo(TabPageImpl);
