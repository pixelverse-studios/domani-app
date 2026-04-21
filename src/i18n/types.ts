import { en } from './catalogs/en'
import { mainUiSupplement } from './supplements/mainUi'
import { settingsModalSupplement } from './supplements/settingsModals'

type Primitive = string | number | boolean | null | undefined

type WidenStrings<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenStrings<U>[]
    : T extends Primitive
      ? T
      : T extends object
        ? { [K in keyof T]: WidenStrings<T[K]> }
        : T

export type BaseTranslationCatalog = WidenStrings<typeof en>
export type TranslationCatalog = BaseTranslationCatalog &
  WidenStrings<(typeof mainUiSupplement)['en']> &
  WidenStrings<(typeof settingsModalSupplement)['en']>

export type TranslationKey<T extends object = TranslationCatalog> = {
  [K in keyof T & string]: T[K] extends Primitive | readonly unknown[]
    ? K
    : T[K] extends object
      ? `${K}.${TranslationKey<T[K]>}`
      : never
}[keyof T & string]

export type TranslationValues = Record<string, string | number>
