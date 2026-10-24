import type { Lang } from '../languages';
import { ar } from './ar';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { id } from './id';
import { ja } from './ja';
import { pt } from './pt';
import { ru } from './ru';
import { tr } from './tr';
import { zh } from './zh';

type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

/** French is the reference: every other language must have exactly the same keys (checked by tsc). */
export type Translations = DeepStrings<typeof fr>;

export const TRANSLATIONS: Record<Lang, Translations> = { fr, en, ar, es, pt, de, tr, id, zh, ja, hi, ru };
