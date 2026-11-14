"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import enMessages from "./en.json";
import bnMessages from "./bn.json";

export type Locale = "en" | "bn";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, ...params: (string | number)[]) => string;
}

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages as unknown as Record<string, string>,
  bn: bnMessages as unknown as Record<string, string>,
};

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("feather_lang") as Locale;
    if (saved === "en" || saved === "bn") {
      setLocaleState(saved);
    } else {
      const browserLang = navigator.language?.toLowerCase() || "";
      if (browserLang.startsWith("bn")) {
        setLocaleState("bn");
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("feather_lang", newLocale);
    document.documentElement.lang = newLocale;
  };

  const t = (key: string, ...params: (string | number)[]): string => {
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
    if (params.length > 0) {
      params.forEach((param, index) => {
        const placeholder = `$${index + 1}`;
        text = text.replace(new RegExp(`\\${placeholder}`, "g"), String(param));
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
