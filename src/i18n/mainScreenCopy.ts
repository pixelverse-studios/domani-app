import { catalogs, getCatalogLocale } from './index'

function mergeWithEnglishFallback<T extends Record<string, unknown>>(english: T, localized: T): T {
  const merged: Record<string, unknown> = { ...english }

  for (const [key, value] of Object.entries(localized)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      merged[key] &&
      typeof merged[key] === 'object' &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = mergeWithEnglishFallback(
        merged[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      )
    } else if (value !== undefined) {
      merged[key] = value
    }
  }

  return merged as T
}

export function getMainScreenCopy(locale: string) {
  const englishCatalog = catalogs.en
  const catalog = catalogs[getCatalogLocale(locale)]

  return {
    tabs: mergeWithEnglishFallback(englishCatalog.navigation.tabs, catalog.navigation.tabs),
    common: {
      cancel: catalog.common.cancel ?? englishCatalog.common.cancel,
      create: catalog.common.create ?? englishCatalog.common.create,
      creating: catalog.common.creating ?? englishCatalog.common.creating,
      deleteTaskTitle: catalog.common.deleteTaskTitle ?? englishCatalog.common.deleteTaskTitle,
      deleteTaskDescription:
        catalog.common.deleteTaskDescription ?? englishCatalog.common.deleteTaskDescription,
      deleteCategoryDescription:
        catalog.common.deleteCategoryDescription ?? englishCatalog.common.deleteCategoryDescription,
      deleteTaskConfirm: catalog.common.deleteTaskConfirm ?? englishCatalog.common.deleteTaskConfirm,
    },
    today: mergeWithEnglishFallback(englishCatalog.todayScreen, catalog.todayScreen),
    planning: mergeWithEnglishFallback(englishCatalog.planningScreen, catalog.planningScreen),
    analytics: mergeWithEnglishFallback(englishCatalog.analyticsScreen, catalog.analyticsScreen),
    feedback: mergeWithEnglishFallback(englishCatalog.feedbackScreen, catalog.feedbackScreen),
    settings: mergeWithEnglishFallback(englishCatalog.settingsScreen, catalog.settingsScreen),
  }
}
