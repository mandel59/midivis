// @ts-nocheck
import appLicense from "../LICENSE"
import eventsLicense from "events/LICENSE"
import { createStateStore, storageKey } from './state.js'
import { resolveLocale, createTranslator, translateDocument } from './i18n.js'

async function render() {
    const store = createStateStore()
    await store.loadState()
    const locale = resolveLocale(store.getState('language'), navigator.languages)
    const t = createTranslator(locale)
    translateDocument(document, locale)
    // Legal license bodies stay verbatim; only the surrounding UI is translated.
    document.getElementById('licenses').textContent = `${t('licenseIntro')}

### ${t('appLicense')}

${appLicense}

---

${t('thirdParty')}

### ${t('eventsLicense')}

${t('eventsNotice')}

${eventsLicense}`
}
render().catch(console.error)
window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) render().catch(console.error)
})
window.addEventListener('languagechange', () => { render().catch(console.error) })
