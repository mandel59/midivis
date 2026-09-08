import en from './locales/en.js'
import ja from './locales/ja.js'

/** @typedef {'en' | 'ja'} Locale */
/** @typedef {'auto' | Locale} LanguagePreference */
/** @typedef {keyof typeof en} MessageKey */
export const catalogs = { en, ja }
/** @param {LanguagePreference} preference @param {readonly string[]} [languages] @returns {Locale} */
export function resolveLocale(preference, languages = []) {
    if (preference !== 'auto') return preference
    for (const language of languages) {
        const base = language.toLowerCase().split('-')[0]
        if (base === 'en' || base === 'ja') return base
    }
    return 'en'
}
/** @param {Locale} locale */
export function createTranslator(locale) {
    /** @param {MessageKey} key @param {Record<string, string>} [params] */
    return (key, params = {}) => (catalogs[locale][key] ?? en[key])
        .replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match)
}
/** Translate text and accessible attributes without replacing controls or using HTML. @param {Document} document @param {Locale} locale */
export function translateDocument(document, locale) {
    const t = createTranslator(locale)
    document.documentElement.lang = locale
    for (const attribute of ['text', 'title', 'aria-label']) {
        const marker = attribute === 'text' ? 'data-i18n' : `data-i18n-${attribute}`
        for (const element of document.querySelectorAll(`[${marker}]`)) {
            const key = /** @type {MessageKey} */ (element.getAttribute(marker))
            if (attribute === 'text') element.textContent = t(key)
            else element.setAttribute(attribute, t(key))
        }
    }
}
/** Stable application error codes keep transport and UI languages separate. */
export class UIError extends Error {
    /** @param {MessageKey} key @param {unknown} [cause] */
    constructor(key, cause) { super(key); this.key = key; this.cause = cause }
}
/** @param {unknown} error @returns {MessageKey} */
export function errorMessageKey(error) {
    if (error instanceof UIError) return error.key
    if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) return 'errorPermission'
    return 'errorUnknown'
}
