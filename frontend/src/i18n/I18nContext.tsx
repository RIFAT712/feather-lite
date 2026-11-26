"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import Banana from "banana-i18n";
import enMessages from "./en.json";
import rawManifest from "./manifest.generated.json";
import {
  formatLocaleNumber,
  formatLocaleDate,
  convertDigits as convertDigitsRaw,
  parseLocaleDigits,
} from "./numbers";
import { isRtlLocale, getLocaleDirection } from "./rtl";

export type Locale = string;

export interface SupportedLanguage {
  code: string;
  name: string;
}

export const supportedLanguages: SupportedLanguage[] = rawManifest as SupportedLanguage[];

export interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  supportedLanguages: SupportedLanguage[];
  t: (key: string, ...params: (string | number | bigint)[]) => string;
  formatNumber: (value: number | bigint | string, options?: Intl.NumberFormatOptions) => string;
  n: (value: number | bigint | string, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  convertDigits: (text: string | number | bigint) => string;
  parseDigits: (text: string) => string;
  isRtl: boolean;
  dir: "ltr" | "rtl";
}

/**
 * Resolves a given locale string against the generated manifest.
 * Checks exact match first, then base language code (e.g. "bn-BD" -> "bn").
 */
export function resolveLocale(desired: string | null | undefined): string | null {
  if (!desired) return null;
  const clean = desired.trim().toLowerCase();
  if (!clean) return null;

  const exact = supportedLanguages.find((l) => l.code.toLowerCase() === clean);
  if (exact) return exact.code;

  const base = clean.split("-")[0];
  const baseMatch = supportedLanguages.find((l) => l.code.toLowerCase() === base);
  if (baseMatch) return baseMatch.code;

  return null;
}

// Module-level in-memory cache for loaded message files
const messageCache = new Map<string, Record<string, string>>();
messageCache.set("en", enMessages as unknown as Record<string, string>);

const defaultContextValue: I18nContextType = {
  locale: "en",
  setLocale: () => {},
  supportedLanguages,
  t: (key) => key,
  formatNumber: (val) => String(val),
  n: (val) => String(val),
  formatDate: (date) => String(date),
  convertDigits: (val) => String(val),
  parseDigits: (val) => String(val),
  isRtl: false,
  dir: "ltr",
};

const I18nContext = createContext<I18nContextType>(defaultContextValue);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>("en");
  const [loadedVersion, setLoadedVersion] = useState<number>(0);

  // Initialize Banana-i18n instance lazily once with "en" as the fallback locale
  const [banana] = useState<Banana>(() => {
    return new Banana("en", {
      finalFallback: "en",
      messages: {
        en: enMessages as unknown as Record<string, string>,
      },
    });
  });

  const loadLocaleMessages = useCallback(
    async (targetLocale: string) => {
      if (targetLocale === "en") return true;
      if (messageCache.has(targetLocale)) {
        banana.load(messageCache.get(targetLocale)!, targetLocale);
        return true;
      }
      try {
        const mod = await import(`./${targetLocale}.json`);
        const msgs = (mod.default || mod) as Record<string, string>;
        messageCache.set(targetLocale, msgs);
        banana.load(msgs, targetLocale);
        return true;
      } catch (err) {
        console.warn(`[i18n] Failed to dynamically load messages for locale "${targetLocale}":`, err);
        return false;
      }
    },
    [banana]
  );

  useEffect(() => {
    try {
      // 1. Check URL query params for ?userlang=... or ?uselang=... (Wikimedia standard)
      let urlLang: string | null = null;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        urlLang = params.get("userlang") || params.get("uselang");
      }

      let resolved = resolveLocale(urlLang);
      if (resolved) {
        // Explicitly requested in URL query: save immediately so it persists!
        try {
          localStorage.setItem("feather_lang", resolved);
          document.cookie = `feather_lang=${resolved};path=/;max-age=31536000;SameSite=Lax`;
        } catch {
          // ignore
        }
      } else {
        // 2. Fall back to saved localStorage preference
        const saved = localStorage.getItem("feather_lang");
        resolved = resolveLocale(saved);

        // 3. Fall back to browser language
        if (!resolved && typeof navigator !== "undefined") {
          const browserLangs = navigator.languages?.length ? navigator.languages : [navigator.language];
          for (const lang of browserLangs) {
            resolved = resolveLocale(lang);
            if (resolved) break;
          }
        }
      }

      const initialLocale = resolved || "en";
      if (initialLocale !== "en") {
        loadLocaleMessages(initialLocale).then(() => {
          banana.setLocale(initialLocale);
          setLocaleState(initialLocale);
          setLoadedVersion((v) => v + 1);
          document.documentElement.lang = initialLocale;
          document.documentElement.dir = getLocaleDirection(initialLocale);
        });
      } else {
        banana.setLocale("en");
        setLocaleState("en");
        setLoadedVersion((v) => v + 1);
        document.documentElement.lang = "en";
        document.documentElement.dir = getLocaleDirection("en");
      }
    } catch {
      // In SSR or restricted storage environments
    }
  }, [banana, loadLocaleMessages]);

  const setLocale = useCallback(
    async (newLocale: string) => {
      const resolved = resolveLocale(newLocale) || "en";
      if (resolved !== "en") {
        await loadLocaleMessages(resolved);
      }
      banana.setLocale(resolved);
      setLocaleState(resolved);
      setLoadedVersion((v) => v + 1);

      try {
        localStorage.setItem("feather_lang", resolved);
        document.cookie = `feather_lang=${resolved};path=/;max-age=31536000;SameSite=Lax`;
        document.documentElement.lang = resolved;
        document.documentElement.dir = getLocaleDirection(resolved);
      } catch {
        // ignore
      }
    },
    [banana, loadLocaleMessages]
  );

  // Listen for dynamic popstate / URL query changes with ?userlang=... or ?uselang=...
  useEffect(() => {
    const handleUrlQueryChange = () => {
      try {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get("userlang") || params.get("uselang");
        if (urlLang) {
          const resolved = resolveLocale(urlLang);
          if (resolved && resolved !== locale) {
            setLocale(resolved);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("popstate", handleUrlQueryChange);
    return () => window.removeEventListener("popstate", handleUrlQueryChange);
  }, [locale, setLocale]);

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
      try {
        // Pass raw numbers (converting bigint to number) into banana.i18n() so CLDR plural evaluation works accurately
        const normalizedParams = params.map((param) => (typeof param === "bigint" ? Number(param) : param));
        return banana.i18n(key, ...normalizedParams);
      } catch (err) {
        console.warn(`[i18n] Failed to format message for key "${key}":`, err);
        const raw = banana.getMessage(key);
        return raw || key;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [banana, locale, loadedVersion]
  );

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      supportedLanguages,
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
