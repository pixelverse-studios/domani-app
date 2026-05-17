import {
  defaultLocale,
  getCatalogLocale,
  isSupportedLocale,
  normalizeLocaleTag,
  resolveSupportedLocale,
} from '../index'

describe('i18n locale helpers', () => {
  it('normalizes locale tags with underscores and mixed casing', () => {
    expect(normalizeLocaleTag(' ES_mx ')).toBe('es-MX')
    expect(normalizeLocaleTag('zh_hant_tw')).toBe('zh-Hant-TW')
  })

  it('resolves exact supported locales case-insensitively', () => {
    expect(resolveSupportedLocale(['ES_mx'])).toBe('es-MX')
    expect(isSupportedLocale('pt_br')).toBe(true)
  })

  it('falls back from unsupported regional variants to a supported language market', () => {
    expect(resolveSupportedLocale(['fr-BE'])).toBe('fr-FR')
    expect(resolveSupportedLocale(['en-NZ'])).toBe('en-US')
  })

  it('preserves Traditional and Simplified Chinese script and region intent', () => {
    expect(resolveSupportedLocale(['zh-Hant-HK'])).toBe('zh-TW')
    expect(resolveSupportedLocale(['zh-Hans-SG'])).toBe('zh-CN')
  })

  it('uses the default locale when no candidates resolve', () => {
    expect(resolveSupportedLocale([null, undefined, 'zz-ZZ'])).toBe(defaultLocale)
  })

  it('maps app locales to the expected catalog locale', () => {
    expect(getCatalogLocale('en-GB')).toBe('en')
    expect(getCatalogLocale('pt-PT')).toBe('pt')
    expect(getCatalogLocale('zh-TW')).toBe('zhHant')
    expect(getCatalogLocale('zh-CN')).toBe('zhHans')
  })
})
