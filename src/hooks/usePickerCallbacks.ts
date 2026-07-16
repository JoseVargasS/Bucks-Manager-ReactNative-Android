import { useCallback, useMemo } from "react";
import { getPalette, type ColorSchemePreference } from "@/theme/colors";
import { COLOR_SCHEME_OPTIONS } from "@/theme/constants";
import {
  CURRENCY_OPTIONS,
  getFontPickerOptions,
} from "@/hooks/usePreferences";
import type { OptionSheetHandle } from "@/components/modals/OptionSheet";
import type { ConfirmConfig } from "@/components/modals/ConfirmModal";
import type { UiCopy } from "@/i18n";
import type {
  LanguageMode,
  FontPreference,
  ThemeMode,
} from "@/types";

type PickerProps = {
  optionSheetRef: React.RefObject<OptionSheetHandle | null>;
  copy: UiCopy;
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  saveLanguage: (next: string) => void;
  saveCurrencySymbol: (next: string) => void;
  saveFontPreference: (next: string) => void;
  saveColorScheme: (next: string) => void;
  colorScheme: ColorSchemePreference;
  theme: ThemeMode;
  colors: { expense: string };
  runGoogleSignIn: (silent: boolean) => void;
  setConfirmConfig: React.Dispatch<
    React.SetStateAction<ConfirmConfig | null>
  >;
};

type PickerCallbacks = {
  openLanguagePicker: () => void;
  openCurrencyPicker: () => void;
  openFontPicker: () => void;
  fontPickerOptions: ReturnType<typeof getFontPickerOptions>;
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
  saveLanguage,
  saveCurrencySymbol,
  saveFontPreference,
  saveColorScheme,
  colorScheme,
  theme,
  colors,
  runGoogleSignIn,
  setConfirmConfig,
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
    optionSheetRef.current?.open({
      title: copy.googleAccounts,
      selectedValue: "",
      options: [
        {
          label: copy.switchAccount,
          value: "switch",
          icon: "account-switch",
        },
        {
          label: copy.removeCurrentAccount,
          value: "remove",
          icon: "account-remove",
          tone: colors.expense,
        },
      ],
      onSelect: (value: string) => {
        if (value === "switch") void runGoogleSignIn(true);
        if (value === "remove")
          setConfirmConfig({ kind: "removeAccount" });
      },
    });
  }, [colors.expense, copy, optionSheetRef, runGoogleSignIn, setConfirmConfig]);

  return {
    openLanguagePicker,
    openCurrencyPicker,
    openFontPicker,
    fontPickerOptions,
    openColorSchemePicker,
    openAccountManager,
  };
}
