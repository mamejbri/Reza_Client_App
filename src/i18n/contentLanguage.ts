import { DEFAULT_LANG, Lang } from './languages';

/** Header read by the backend to translate database content (Google Cloud Translation). */
export const CONTENT_LANG_HEADER = 'X-Lang';

// Kept outside React (and outside LocaleProvider, which imports the http client) so the
// request interceptor can read it without an import cycle.
let contentLang: Lang = DEFAULT_LANG;

export function setContentLanguage(lang: Lang): void {
  contentLang = lang;
}

/** Language in which the API should return prestations, descriptions, reviews... */
export function getContentLanguage(): Lang {
  return contentLang;
}
