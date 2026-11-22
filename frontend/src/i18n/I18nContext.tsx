"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import enMessages from "./en.json";
import bnMessages from "./bn.json";
import arMessages from "./ar.json";
import faMessages from "./fa.json";
import { formatLocaleNumber, formatLocaleDate, convertDigits as convertDigitsRaw, parseLocaleDigits } from "./numbers";
import { isRtlLocale, getLocaleDirection } from "./rtl";

export type Locale = "en" | "bn" | "ar" | "fa";

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, ...params: (string | number | bigint)[]) => string;
  formatNumber: (value: number | bigint | string, options?: Intl.NumberFormatOptions) => string;
  n: (value: number | bigint | string, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  convertDigits: (text: string | number | bigint) => string;
  parseDigits: (text: string) => string;
  isRtl: boolean;
  dir: "ltr" | "rtl";
}

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages as unknown as Record<string, string>,
  bn: bnMessages as unknown as Record<string, string>,
  ar: arMessages as unknown as Record<string, string>,
  fa: faMessages as unknown as Record<string, string>,
};

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  formatNumber: (val) => String(val),
  n: (val) => String(val),
  formatDate: (date) => String(date),
  convertDigits: (val) => String(val),
  parseDigits: (val) => String(val),
  isRtl: false,
  dir: "ltr",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("feather_lang") as Locale;
      if (saved && (saved === "en" || saved === "bn" || saved === "ar" || saved === "fa")) {
        setLocaleState(saved);
        document.documentElement.lang = saved;
        document.documentElement.dir = getLocaleDirection(saved);
      } else {
        const browserLang = navigator.language?.toLowerCase() || "";
        let detected: Locale = "en";
        if (browserLang.startsWith("bn")) detected = "bn";
        else if (browserLang.startsWith("ar")) detected = "ar";
        else if (browserLang.startsWith("fa")) detected = "fa";
        setLocaleState(detected);
        document.documentElement.lang = detected;
        document.documentElement.dir = getLocaleDirection(detected);
      }
    } catch {
      // In SSR or restricted storage environments
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("feather_lang", newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = getLocaleDirection(newLocale);
    } catch {
      // ignore
    }
  }, []);

  const formatNumber = useCallback(
    (value: number | bigint | string, options?: Intl.NumberFormatOptions): string => {
      return formatLocaleNumber(value, locale, options);
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      return formatLocaleDate(date, locale, options);
    },
    [locale]
  );

  const convertDigits = useCallback(
    (text: string | number | bigint): string => {
      return convertDigitsRaw(text, locale);
    },
    [locale]
  );

  const parseDigits = useCallback((text: string): string => {
    return parseLocaleDigits(text);
  }, []);

  const isRtl = useMemo(() => isRtlLocale(locale), [locale]);
  const dir = useMemo(() => getLocaleDirection(locale), [locale]);

  const t = useCallback(
    (key: string, ...params: (string | number | bigint)[]): string => {
      // 1. Check current locale
      let text = messages[locale]?.[key];
      // 2. Fallback to English
      if (!text && locale !== "en") {
        text = messages.en?.[key];
      }
      // 3. Fallback to raw key
      if (!text) {
        return key;
      }

      // Replace $1, $2, etc. (Translatewiki standard)
      // Automatically format number/bigint parameters with native digits and locale grouping!
      if (params.length > 0) {
        // Handle {{PLURAL:$n|one|other}} (Translatewiki / MediaWiki standard)
        text = text.replace(/\{\{PLURAL:\$([0-9]+)\|([^|{}]+)\|([^|{}]+)\}\}/gi, (_match, paramIdxStr, singular, plural) => {
          const pIndex = parseInt(paramIdxStr, 10) - 1;
          const val = params[pIndex];
          const num = typeof val === "number" || typeof val === "bigint" ? Number(val) : parseFloat(String(val));
          if (!isNaN(num) && num === 1) {
            return singular;
          }
          return plural;
        });

        params.forEach((param, index) => {
          const placeholder = `$${index + 1}`;
          let formattedParam: string;
          if (typeof param === "number" || typeof param === "bigint") {
            formattedParam = formatLocaleNumber(param, locale);
          } else {
            formattedParam = String(param);
          }
          text = text.replace(new RegExp(`\\${placeholder}`, "g"), formattedParam);
        });
      }

      return text;
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatNumber,
      n: formatNumber,
      formatDate,
      convertDigits,
      parseDigits,
      isRtl,
      dir,
    }),
    [locale, setLocale, t, formatNumber, formatDate, convertDigits, parseDigits, isRtl, dir]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
