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

type DeepPartial<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenStrings<U>[]
    : T extends Primitive
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> } & Record<string, unknown>
        : T

export type FullBaseTranslationCatalog = WidenStrings<typeof en>
export type BaseTranslationCatalog = DeepPartial<FullBaseTranslationCatalog>
export type TranslationCatalog = FullBaseTranslationCatalog &
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
