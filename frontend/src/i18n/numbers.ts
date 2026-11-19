/**
 * Locale-aware digit and number formatting engine for Feather 2.0.
 * Automatically supports Bengali, Arabic, Persian, Urdu, Devanagari, and Latin digit scripts.
 */

export const DIGIT_MAPS: Record<string, string[]> = {
  // Bengali / Assamese
  bn: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
  as: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
  // Eastern Arabic-Indic (Arabic)
  ar: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"],
  // Extended Arabic-Indic (Persian, Urdu, Pashto, Sindhi, Kashmiri)
  fa: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  ur: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  ps: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  sd: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  ks: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  // Devanagari (Hindi, Marathi, Nepali, Sanskrit)
  hi: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  mr: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  ne: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  sa: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  // Gurmukhi (Punjabi)
  pa: ["੦", "੧", "੨", "੩", "੪", "੫", "੬", "੭", "੮", "੯"],
  // Gujarati
  gu: ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"],
  // Oriya (Odia)
  or: ["\u0B66", "\u0B67", "\u0B68", "\u0B69", "\u0B6A", "\u0B6B", "\u0B6C", "\u0B6D", "\u0B6E", "\u0B6F"],
};

export const NUMBERING_SYSTEM_TAGS: Record<string, string> = {
  bn: "bn-u-nu-beng",
  as: "as-u-nu-beng",
  ar: "ar-u-nu-arab",
  fa: "fa-u-nu-arabext",
  ur: "ur-u-nu-arabext",
  ps: "ps-u-nu-arabext",
  sd: "sd-u-nu-arabext",
  hi: "hi-u-nu-deva",
  mr: "mr-u-nu-deva",
  ne: "ne-u-nu-deva",
  pa: "pa-u-nu-guru",
  gu: "gu-u-nu-gujr",
  or: "or-u-nu-orya",
};

const NATIVE_TO_ASCII: Record<string, string> = {
  // Bengali
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  // Arabic
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  // Persian / Urdu
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  // Devanagari
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  // Gurmukhi
  "੦": "0", "੧": "1", "੨": "2", "੩": "3", "੪": "4", "੫": "5", "੬": "6", "੭": "7", "੮": "8", "੯": "9",
  // Gujarati
  "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4", "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9",
  // Oriya (Odia)
  "\u0B66": "0", "\u0B67": "1", "\u0B68": "2", "\u0B69": "3", "\u0B6A": "4", "\u0B6B": "5", "\u0B6C": "6", "\u0B6D": "7", "\u0B6E": "8", "\u0B6F": "9",
};

/**
 * Converts any ASCII digits [0-9] in a string or number to the locale's native script digits.
 */
export function convertDigits(input: string | number | bigint, locale: string): string {
  if (input === null || input === undefined) return "";
  const base = locale.toLowerCase().split("-")[0];
  const map = DIGIT_MAPS[base];
  if (!map) return String(input);
  return String(input).replace(/[0-9]/g, (digit) => map[parseInt(digit, 10)]);
}

/**
 * Parses native script digits (Bengali, Arabic, Persian, Devanagari, etc.) back to standard ASCII digits.
 */
export function parseLocaleDigits(input: string): string {
  if (!input) return "";
  return String(input).replace(/[০-৯٠-٩۰-۹०-९੦-੯૦-૯୦-୯]/g, (ch) => NATIVE_TO_ASCII[ch] || ch);
}

/**
 * Formats a numeric value using locale-aware groupings, decimals, and native script digits.
 */
export function formatLocaleNumber(
  value: number | bigint | string,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined) return "";

  // If passed as a string (e.g. "42", "1250", "3.14")
  let numVal: number | bigint;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    const asciiClean = parseLocaleDigits(trimmed);
    const parsed = Number(asciiClean);
    if (isNaN(parsed)) {
      // It's a non-numeric string with digits (e.g., date "2026-11-18"), convert digits only
      return convertDigits(value, locale);
    }
    numVal = parsed;
  } else {
    numVal = value;
  }

  const base = locale.toLowerCase().split("-")[0];
  const bcpTag = NUMBERING_SYSTEM_TAGS[base] || locale;

  try {
    return new Intl.NumberFormat(bcpTag, options).format(numVal);
  } catch {
    // Fallback if Intl.NumberFormat with custom tag is unsupported
    const raw = String(numVal);
    return convertDigits(raw, locale);
  }
}

export const LOCALE_DATE_TAGS: Record<string, string> = {
  bn: "bn-BD",
  ar: "ar-u-nu-arab",
  fa: "fa-IR",
  ur: "ur-PK",
  hi: "hi-IN",
  en: "en-US",
};

/**
 * Formats a Date, ISO string, or timestamp into locale-aware digits and date format.
 */
export function formatLocaleDate(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  try {
    const d = typeof date === "object" ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const base = locale.toLowerCase().split("-")[0];
    const tag = LOCALE_DATE_TAGS[base] || locale;
    return new Intl.DateTimeFormat(tag, options).format(d);
  } catch {
    return String(date);
  }
}

