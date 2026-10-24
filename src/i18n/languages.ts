export type Lang = 'fr' | 'en' | 'ar' | 'es' | 'pt' | 'de' | 'tr' | 'id' | 'zh' | 'ja' | 'hi' | 'ru';

export interface LanguageInfo {
  code: Lang;
  label: string;
  rtl: boolean;
  /** Intl locale (ar-MA keeps Latin digits) */
  intl: string;
  /** dayjs locale id */
  dayjs: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'fr', label: 'Français', rtl: false, intl: 'fr-FR', dayjs: 'fr' },
  { code: 'en', label: 'English', rtl: false, intl: 'en-US', dayjs: 'en' },
  { code: 'ar', label: 'العربية', rtl: true, intl: 'ar-MA', dayjs: 'ar-ma' },
  { code: 'es', label: 'Español', rtl: false, intl: 'es-ES', dayjs: 'es' },
  { code: 'pt', label: 'Português (Brasil)', rtl: false, intl: 'pt-BR', dayjs: 'pt-br' },
  { code: 'de', label: 'Deutsch', rtl: false, intl: 'de-DE', dayjs: 'de' },
  { code: 'tr', label: 'Türkçe', rtl: false, intl: 'tr-TR', dayjs: 'tr' },
  { code: 'id', label: 'Bahasa Indonesia', rtl: false, intl: 'id-ID', dayjs: 'id' },
  { code: 'zh', label: '简体中文', rtl: false, intl: 'zh-CN', dayjs: 'zh-cn' },
  { code: 'ja', label: '日本語', rtl: false, intl: 'ja-JP', dayjs: 'ja' },
  { code: 'hi', label: 'हिन्दी', rtl: false, intl: 'hi-IN', dayjs: 'hi' },
  { code: 'ru', label: 'Русский', rtl: false, intl: 'ru-RU', dayjs: 'ru' },
];

export const DEFAULT_LANG: Lang = 'fr';

export const BASE_CURRENCY = 'MAD';
export const CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'TND'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const isLang = (v: unknown): v is Lang => LANGUAGES.some((l) => l.code === v);
export const isCurrency = (v: unknown): v is CurrencyCode => (CURRENCIES as readonly unknown[]).includes(v);
export const languageInfo = (lang: Lang) => LANGUAGES.find((l) => l.code === lang)!;
