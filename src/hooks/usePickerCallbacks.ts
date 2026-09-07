import { useCallback, useMemo } from "react";
import { getPalette, type ColorSchemePreference } from "@/theme/colors";
import { COLOR_SCHEME_OPTIONS } from "@/theme/constants";
import {
  CURRENCY_OPTIONS,
  getFontPickerOptions,
} from "@/hooks/usePreferences";
import { FONT_SIZE_SCALE_LEVELS } from "@/components/ui/fontConstants";
import type { OptionSheetHandle } from "@/components/modals/OptionSheet";
import type { ConfirmConfig } from "@/components/modals/ConfirmModal";
import type { UiCopy } from "@/i18n";
import type {
  LanguageMode,
  FontPreference,
  ThemeMode,
  MaterialIconName,
} from "@/types";

type PickerProps = {
  optionSheetRef: React.RefObject<OptionSheetHandle | null>;
  copy: UiCopy;
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  fontSizeScale: number;
  saveLanguage: (next: string) => void;
  saveCurrencySymbol: (next: string) => void;
  saveFontPreference: (next: string) => void;
  saveFontSizeScale: (next: number) => void;
  saveColorScheme: (next: string) => void;
  colorScheme: ColorSchemePreference;
  theme: ThemeMode;
  colors: { expense: string };
  runGoogleSignIn: (silent: boolean) => void;
  switchToAccount?: (email: string) => void;
  setConfirmConfig: React.Dispatch<
    React.SetStateAction<ConfirmConfig | null>
  >;
  accountInfo?: { name?: string; email?: string } | null;
};

type PickerCallbacks = {
  openLanguagePicker: () => void;
  openCurrencyPicker: () => void;
  openFontPicker: () => void;
  fontPickerOptions: ReturnType<typeof getFontPickerOptions>;
  openFontSizePicker: () => void;
  openColorSchemePicker: () => void;
  openAccountManager: () => void;
};

/**
 * Creates the callbacks that open the OptionSheet for each user-facing
 * preference picker (language, currency, font, colour scheme) and the
 * Google account manager.
 *
 * The returned `fontPickerOptions` is memoised separately because it is
 * also used in Settings to preview each font in its own family.
 */
export function usePickerCallbacks({
  optionSheetRef,
  copy,
  language,
  currencySymbol,
  fontPreference,
  fontSizeScale,
  saveLanguage,
  saveCurrencySymbol,
  saveFontPreference,
  saveFontSizeScale,
  saveColorScheme,
  colorScheme,
  theme,
  colors,
  runGoogleSignIn,
  switchToAccount,
  setConfirmConfig,
  accountInfo,
}: PickerProps): PickerCallbacks {
  const openLanguagePicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.language,
      selectedValue: language,
      options: [
        { label: copy.spanish, value: "es", icon: "translate" },
        { label: copy.english, value: "en", icon: "translate" },
      ],
      onSelect: saveLanguage,
    });
  }, [copy, language, saveLanguage, optionSheetRef]);

  const openCurrencyPicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.currencySymbol,
      selectedValue: currencySymbol,
      options: CURRENCY_OPTIONS.map((option) => ({
        label: language === "en" ? option.labelEn : option.labelEs,
        value: option.value,
        icon: option.icon,
      })),
      onSelect: saveCurrencySymbol,
    });
  }, [copy.currencySymbol, currencySymbol, language, saveCurrencySymbol, optionSheetRef]);

  const fontPickerOptions = useMemo(
    () => getFontPickerOptions(copy),
    [copy],
  );

  const openFontPicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.fontStyle,
      selectedValue: fontPreference,
      options: fontPickerOptions,
      onSelect: saveFontPreference,
    });
  }, [copy.fontStyle, fontPreference, fontPickerOptions, saveFontPreference, optionSheetRef]);

  const openFontSizePicker = useCallback(() => {
    const levels: Array<{ key: string; value: number; label: string }> = [
      { key: "xs", value: FONT_SIZE_SCALE_LEVELS.xs, label: `XS — ${FONT_SIZE_SCALE_LEVELS.xs}` },
      { key: "s", value: FONT_SIZE_SCALE_LEVELS.s, label: `S — ${FONT_SIZE_SCALE_LEVELS.s}` },
      { key: "m", value: FONT_SIZE_SCALE_LEVELS.m, label: `M — ${FONT_SIZE_SCALE_LEVELS.m}` },
      { key: "l", value: FONT_SIZE_SCALE_LEVELS.l, label: `L — ${FONT_SIZE_SCALE_LEVELS.l}` },
      { key: "xl", value: FONT_SIZE_SCALE_LEVELS.xl, label: `XL — ${FONT_SIZE_SCALE_LEVELS.xl}` },
    ];
    optionSheetRef.current?.open({
      title: copy.fontSize,
      selectedValue: String(fontSizeScale),
      options: levels.map((lvl) => ({
        label: lvl.label,
        value: String(lvl.value),
        icon: "format-size" as const,
      })),
      onSelect: (v: string) => saveFontSizeScale(parseFloat(v)),
      preview: { hint: copy.fontSizePreview, example: "S/ 1,234.56" },
      sliderValues: levels.map((l) => l.value),
      keepOpenOnSelect: true,
    });
  }, [copy.fontSize, copy.fontSizePreview, fontSizeScale, saveFontSizeScale, optionSheetRef]);

  const openColorSchemePicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.colorPalette,
      selectedValue: colorScheme,
      options: COLOR_SCHEME_OPTIONS.map((option) => ({
        label: language === "en" ? option.labelEn : option.labelEs,
        value: option.value,
        icon: option.icon,
        tone: getPalette(theme, option.value).primary,
      })),
      onSelect: saveColorScheme,
    });
  }, [colorScheme, copy.colorPalette, language, saveColorScheme, theme, optionSheetRef]);

  const openAccountManager = useCallback(() => {
    void (async () => {
      const { loadConnectedAccounts } = await import("@/data/connectedAccounts");
      const accounts = await loadConnectedAccounts();
      const currentEmail = accountInfo?.email?.toLowerCase() || "";
      const hasCurrent = Boolean(currentEmail);
      const options: Array<{ label: string; value: string; icon: MaterialIconName; tone?: string; trailingIcon?: MaterialIconName; trailingTone?: string; onTrailingPress?: () => void }> = [];

      // Cuentas ya conectadas: tacho a la derecha por fila
      for (const acc of accounts) {
        const isCurrent = acc.email.toLowerCase() === currentEmail;
        options.push({
          label: acc.name ? `${acc.name} (${acc.email})` : acc.email,
          value: `account:${acc.email}`,
          icon: "account",
          trailingIcon: "trash-can-outline",
          trailingTone: colors.expense,
          onTrailingPress: () =>
            setConfirmConfig(
              isCurrent
                ? ({ kind: "removeAccount", email: acc.email, name: acc.name } as unknown as ConfirmConfig)
                : ({ kind: "removeConnectedAccount", email: acc.email, name: acc.name } as unknown as ConfirmConfig),
            ),
        });
      }

      // Botón para conectar una cuenta nueva (no listada)
      options.push({
        label: (copy as unknown as { connectNewAccount?: string }).connectNewAccount || "Conectar nueva cuenta",
        value: "new",
        icon: "account-plus",
      });

      optionSheetRef.current?.open({
        title: copy.googleAccounts,
        selectedValue: hasCurrent ? `account:${accountInfo?.email}` : "",
        options,
        onSelect: (value: string) => {
          if (value === "new") void runGoogleSignIn(true);
          else if (value.startsWith("account:")) {
            const email = value.slice(8);
            if (email.toLowerCase() === currentEmail) return;
            if (switchToAccount) void switchToAccount(email);
            else void runGoogleSignIn(true);
          }
        },
      });
    })();
  }, [accountInfo, colors.expense, copy, optionSheetRef, runGoogleSignIn, switchToAccount, setConfirmConfig]);

  return {
    openLanguagePicker,
    openCurrencyPicker,
    openFontPicker,
    fontPickerOptions,
    openFontSizePicker,
    openColorSchemePicker,
    openAccountManager,
  };
}
