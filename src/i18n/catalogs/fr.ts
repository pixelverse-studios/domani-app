import { en } from './en'
import type { TranslationCatalog } from '../types'

// Translation scaffold for the first expansion wave.
// This file is intentionally not registered in src/i18n/index.ts yet.
// It exists so translation work can proceed without reshaping the catalog later.
export const fr: TranslationCatalog = { ...en }
