import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, I18nManager } from 'react-native';
import { Alert } from '../ui/AppAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';
import 'dayjs/locale/ar-ma';
import 'dayjs/locale/es';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/de';
import 'dayjs/locale/tr';
import 'dayjs/locale/id';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/ja';
import 'dayjs/locale/hi';
import 'dayjs/locale/ru';
import { LocaleConfig } from 'react-native-calendars';

import http from '../api/http';
import {
  BASE_CURRENCY,
  CURRENCIES,
  CurrencyCode,
  DEFAULT_LANG,
  LANGUAGES,
  Lang,
  isCurrency,
  isLang,
  languageInfo,
} from './languages';
import { TRANSLATIONS } from './translations';

const LANG_KEY = 'reza_lang';
const CURRENCY_KEY = 'reza_currency';

type Params = Record<string, unknown>;

interface LocaleContextValue {
  lang: Lang;
  languages: typeof LANGUAGES;
  t: (key: string, params?: Params) => string;
  setLanguage: (lang: Lang) => void;
  /** Currency actually used for display (falls back to MAD until rates are known). */
  currency: CurrencyCode;
  selectedCurrency: CurrencyCode;
  currencies: typeof CURRENCIES;
  setCurrency: (code: CurrencyCode) => void;
  /** Formats an amount stored in MAD in the display currency. */
  formatMoney: (amountInMad: number | string | null | undefined) => string;
  /** Formats an ISO date ("2025-04-15") with a dayjs pattern in the current language. */
  formatDate: (iso: string, pattern?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Feeds react-native-calendars with month/day names from dayjs for the given language. */
function configureCalendarLocale(lang: Lang, todayLabel: string) {
  const loc = languageInfo(lang).dayjs;
  const base = dayjs('2024-01-07').locale(loc); // a Sunday
  LocaleConfig.locales[lang] = {
    monthNames: Array.from({ length: 12 }, (_, m) => base.month(m).format('MMMM')),
    monthNamesShort: Array.from({ length: 12 }, (_, m) => base.month(m).format('MMM')),
    dayNames: Array.from({ length: 7 }, (_, d) => base.day(d).format('dddd')),
    dayNamesShort: Array.from({ length: 7 }, (_, d) => base.day(d).format('dd')),
    today: todayLabel,
  };
  LocaleConfig.defaultLocale = lang;
}

let currentLang: Lang = DEFAULT_LANG;

function format(lang: Lang, key: string, params?: Params): string {
  const raw = lookup(TRANSLATIONS[lang], key) ?? lookup(TRANSLATIONS[DEFAULT_LANG], key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => String(params[name] ?? ''));
}

/** Translation outside React (services, module-level helpers); follows the current language. */
export function translate(key: string, params?: Params): string {
  return format(currentLang, key, params);
}

function applyLanguageGlobals(lang: Lang) {
  currentLang = lang;
  dayjs.locale(languageInfo(lang).dayjs);
  configureCalendarLocale(lang, lookup(TRANSLATIONS[lang], 'calendar.today') ?? '');
}

// Apply defaults synchronously so the first render is already consistent.
applyLanguageGlobals(DEFAULT_LANG);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(BASE_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>({ [BASE_CURRENCY]: 1 });

  // Restore saved choices before rendering the app (avoids a flash of the wrong language).
  // Storage must never block startup: after a short wait the app renders with defaults.
  useEffect(() => {
    (async () => {
      try {
        const timeout = new Promise<[null, null]>((resolve) => setTimeout(() => resolve([null, null]), 1500));
        const [savedLang, savedCurrency] = await Promise.race([
          Promise.all([AsyncStorage.getItem(LANG_KEY), AsyncStorage.getItem(CURRENCY_KEY)]),
          timeout,
        ]);
        const startLang = isLang(savedLang) ? savedLang : DEFAULT_LANG;
        if (startLang !== DEFAULT_LANG) {
          applyLanguageGlobals(startLang);
          setLang(startLang);
        }
        // Keep the native direction in sync with the language (self-heals a stale forceRTL).
        const rtl = languageInfo(startLang).rtl;
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
        if (isCurrency(savedCurrency)) setSelectedCurrency(savedCurrency);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Display-only exchange rates (base MAD); keeps MAD if the call fails.
  const loadRates = useCallback(() => {
    http
      .get<{ rates: Record<string, number> }>('/public/exchange-rates')
      .then(({ data }) => setRates({ ...(data?.rates ?? {}), [BASE_CURRENCY]: 1 }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  // Rates may be missing (offline at launch, server not refreshed yet): retry when the user picks a
  // currency we can't convert yet, and when the app comes back to the foreground.
  const ratesRef = useRef(rates);
  ratesRef.current = rates;
  const selectedRef = useRef(selectedCurrency);
  selectedRef.current = selectedCurrency;

  useEffect(() => {
    if (selectedCurrency !== BASE_CURRENCY && !ratesRef.current[selectedCurrency]) loadRates();
  }, [selectedCurrency, loadRates]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && selectedRef.current !== BASE_CURRENCY && !ratesRef.current[selectedRef.current]) {
        loadRates();
      }
    });
    return () => sub.remove();
  }, [loadRates]);

  const t = useCallback((key: string, params?: Params) => format(lang, key, params), [lang]);

  const setLanguage = useCallback((next: Lang) => {
    applyLanguageGlobals(next);
    setLang(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});

    // Always (re)apply the direction — switching ar -> fr must undo a previous forceRTL(true).
    // I18nManager.isRTL is the direction the app started with; when the new one differs, some
    // native parts only follow after a restart, so the user is told.
    const rtl = languageInfo(next).rtl;
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    if (I18nManager.isRTL !== rtl) {
      const dict = TRANSLATIONS[next];
      Alert.alert(lookup(dict, 'locale.restartTitle') ?? '', lookup(dict, 'locale.restartMessage') ?? '');
    }
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setSelectedCurrency(code);
    AsyncStorage.setItem(CURRENCY_KEY, code).catch(() => {});
  }, []);

  const currency: CurrencyCode = rates[selectedCurrency] ? selectedCurrency : BASE_CURRENCY;

  const formatMoney = useCallback(
    (amountInMad: number | string | null | undefined) => {
      if (amountInMad === null || amountInMad === undefined || amountInMad === '') return '';
      const n = Number(amountInMad);
      if (!Number.isFinite(n)) return '';
      const value = n * (rates[currency] ?? 1);
      const digits = currency === BASE_CURRENCY && Number.isInteger(value) ? 0 : 2;
      try {
        return new Intl.NumberFormat(languageInfo(lang).intl, {
          style: 'currency',
          currency,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(value);
      } catch {
        return `${value.toFixed(digits)} ${currency}`;
      }
    },
    [rates, currency, lang],
  );

  const formatDate = useCallback(
    (iso: string, pattern = 'dddd D MMM YYYY') => dayjs(iso).locale(languageInfo(lang).dayjs).format(pattern),
    [lang],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      lang,
      languages: LANGUAGES,
      t,
      setLanguage,
      currency,
      selectedCurrency,
      currencies: CURRENCIES,
      setCurrency,
      formatMoney,
      formatDate,
    }),
    [lang, t, setLanguage, currency, selectedCurrency, setCurrency, formatMoney, formatDate],
  );

  if (!ready) return null;
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useI18n must be used inside <LocaleProvider>');
  return ctx;
}
