import { createTranslator, resolveLocale, translateDocument, errorMessageKey } from './i18n.js'
import { colorSchemes } from './color-scheme.js'
import { arrangementGroups } from './note-arrangement.js'
import { isSharpKey } from './note-style.js'

/**
 * @param {Document} document
 * @param {ReturnType<import('./state.js').createStateStore>} store
 * @param {{selectPort: (id: string) => Promise<void>, listPorts: () => Promise<{id: string, name: string, selected: boolean}[]>}} ports
 */
export function createSettingsUI(document, store, ports) {
    /** @param {string} id */
    const required = id => {
        const element = document.getElementById(id)
        if (!element) throw new Error(`#${id} not found`)
        return element
    }
    /** @param {string} id */
    const input = id => /** @type {HTMLInputElement} */ (required(id))
    /** @param {string} id */
    const select = id => /** @type {HTMLSelectElement} */ (required(id))
    /** @type {(() => void)[]} */
    const disposers = []
    /** @param {EventTarget} element @param {string} type @param {(event: any) => void} handler */
    const on = (element, type, handler) => {
        element.addEventListener(type, handler)
        disposers.push(() => element.removeEventListener(type, handler))
    }
    const browserLanguages = () => document.defaultView?.navigator.languages ?? ['en']
    let locale = resolveLocale(store.getState('language'), browserLanguages())
    let t = createTranslator(locale)
    /** @type {import('./i18n.js').Locale | undefined} */
    let renderedLocale
    on(select('state-language'), 'change', () => {
        const language = select('state-language').value
        if (language === 'auto' || language === 'en' || language === 'ja') store.updateState({ language })
    })
    const config = required('config')
    const tabs = [...config.querySelectorAll('button[role="tab"]')]
    /** @param {number} index @param {boolean} [focus] */
    function selectTab(index, focus = false) {
        tabs.forEach((tab, i) => {
            const selected = i === index
            tab.setAttribute('aria-selected', String(selected))
            const button = /** @type {HTMLButtonElement} */ (tab)
            button.tabIndex = selected ? 0 : -1
            required(button.getAttribute('aria-controls') ?? '').hidden = !selected
            if (selected && focus) button.focus()
        })
        const content = config.querySelector('.settings-content')
        if (content) content.scrollTop = 0
    }
    tabs.forEach((tab, index) => {
        on(tab, 'click', () => selectTab(index))
        on(tab, 'keydown', (/** @type {KeyboardEvent} */ event) => {
            let next
            if (event.key === 'ArrowDown') next = (index + 1) % tabs.length
            else if (event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = tabs.length - 1
            else return
            event.preventDefault()
            selectTab(next, true)
        })
    })
    const portSelect = select('config-midi-input-port')
    const colorCategory = select('state-colorCategory')
    const colorScheme = select('state-colorScheme')
    on(colorCategory, 'change', () => {
        const scheme = colorSchemes.find(({ category }) => category === colorCategory.value)
        if (scheme) store.updateState({ colorScheme: scheme.id })
    })
    on(colorScheme, 'change', () => {
        const scheme = colorSchemes.find(({ id, category }) => id === colorScheme.value && category === colorCategory.value)
        if (scheme) store.updateState({ colorScheme: scheme.id })
    })
    const arrangement = document.createElement('select')
    arrangement.id = 'state-noteArrangement'
    arrangement.setAttribute('aria-describedby', 'arrangement-help')
    const families = arrangementGroups.flatMap(group => group.families)
    for (const group of arrangementGroups) {
        const optgroup = document.createElement('optgroup')
        optgroup.dataset.group = group.id
        for (const { id } of group.families) {
            const option = document.createElement('option')
            option.value = id
            option.dataset.i18n = `layout.${id}`
            optgroup.append(option)
        }
        arrangement.append(optgroup)
    }
    required('config-noteArrangement').replaceChildren(arrangement)
    const arrangementVariant = select('state-arrangementVariant')
    on(arrangement, 'change', () => {
        const family = families.find(({ id }) => id === arrangement.value)
        if (family) store.updateState({ noteArrangement: family.id })
    })
    on(arrangementVariant, 'change', () => {
        const family = families.find(({ id }) => id === arrangement.value)
        const variant = family?.variants.find(id => id === arrangementVariant.value)
        if (variant) store.updateState({ noteArrangement: variant })
    })
    for (const key of /** @type {const} */ (['sharp', 'useDegree', 'showToolbar', 'ignoreOctave'])) {
        const checkbox = input(`state-${key}`)
        on(checkbox, 'change', () => store.updateState({ [key]: checkbox.checked }))
    }
    for (const field of ['key', 'mode']) {
        on(select(`state-${field}`), 'change', () => {
            const key = Number(select('state-key').value)
            const mode = Number(select('state-mode').value)
            store.updateState({ key, mode, sharp: isSharpKey(key, mode, store.getState('sharp')) })
        })
    }
    const offset = input('state-noteOffset')
    const offsetError = required('offset-error')
    function resetOffset() {
        offset.removeAttribute('aria-invalid')
        offsetError.hidden = true
        offsetError.textContent = ''
        offset.value = String(store.getState('noteOffsets')[Number(select('state-channel').value) - 1] ?? 0)
    }
    on(select('state-channel'), 'change', resetOffset)
    on(offset, 'change', () => {
        const value = offset.valueAsNumber
        if (!Number.isInteger(value) || value < -24 || value > 24) {
            offset.setAttribute('aria-invalid', 'true')
            offsetError.textContent = t('offsetError')
            offsetError.hidden = false
            return
        }
        offset.removeAttribute('aria-invalid')
        offsetError.hidden = true
        const noteOffsets = store.getState('noteOffsets')
        noteOffsets[Number(select('state-channel').value) - 1] = value
        store.updateState({ noteOffsets })
    })
    const settingsButton = required('menu-settings')
    const closeButton = required('config-close')
    const status = required('midi-status')
    /** @type {import('./i18n.js').MessageKey} */
    let statusKey = 'notConnected'
    /** @type {Record<string, string>} */
    let statusParams = {}
    /** @type {import('./i18n.js').MessageKey | undefined} */
    let currentErrorKey
    /** @param {import('./i18n.js').MessageKey} key @param {Record<string, string>} [params] */
    function setStatus(key, params = {}) {
        statusKey = key
        statusParams = params
        status.textContent = t(key, params)
    }
    const refreshButton = /** @type {HTMLButtonElement} */ (required('midi-refresh'))
    let request = 0
    let connecting = false
    let disposed = false
    /** @type {HTMLElement | null} */
    let returnFocus = null
    function openPanel() {
        if (!config.hidden) return
        returnFocus = /** @type {HTMLElement | null} */ (document.activeElement)
        config.hidden = false
        config.classList.add('shown')
        settingsButton.setAttribute('aria-expanded', 'true')
        closeButton.focus()
    }
    function closePanel() {
        config.hidden = true
        config.classList.remove('shown')
        settingsButton.setAttribute('aria-expanded', 'false')
        resetOffset()
        const target = returnFocus?.isConnected && returnFocus.tabIndex >= 0 && returnFocus.getClientRects().length ? returnFocus : settingsButton
        target.focus()
    }
    /** @param {unknown} error */
    function handleError(error) {
        if (disposed) return
        console.error(error)
        openPanel()
        currentErrorKey = errorMessageKey(error)
        required('oops-message').textContent = t(currentErrorKey)
        required('oops').hidden = false
        required('oops').classList.add('shown')
        required('oops').scrollIntoView?.({ block: 'nearest' })
    }
    function dismissError() {
        currentErrorKey = undefined
        required('oops').hidden = true
        required('oops').classList.remove('shown')
        if (required('oops').contains(document.activeElement)) closeButton.focus()
    }
    async function refreshPorts() {
        const current = ++request
        if (!connecting) setStatus('checking')
        portSelect.disabled = true
        refreshButton.disabled = true
        try {
            const options = await ports.listPorts()
            if (disposed || current !== request) return
            portSelect.replaceChildren()
            const placeholder = document.createElement('option')
            placeholder.value = ''
            placeholder.dataset.i18n = 'notConnected'
            placeholder.textContent = t('notConnected')
            portSelect.append(placeholder)
            for (const { id, name, selected } of options) {
                const option = document.createElement('option')
                option.value = id
                option.textContent = options.filter(port => port.name === name).length > 1 ? `${name} (${id})` : name
                option.selected = selected
                portSelect.append(option)
            }
            const active = options.find(port => port.selected)
            if (!connecting) setStatus(active ? 'connected' : options.length ? 'chooseInput' : 'noInputs', active ? { name: active.name } : {})
            portSelect.title = portSelect.selectedOptions[0]?.textContent ?? ''
        } catch (error) {
            if (disposed || current !== request) return
            setStatus('unavailable')
            throw error
        } finally {
            if (!disposed && current === request) {
                portSelect.disabled = connecting
                refreshButton.disabled = connecting
            }
        }
    }
    async function showConfigDialog() {
        openPanel()
        await refreshPorts()
    }
    on(settingsButton, 'click', () => {
        if (config.hidden) showConfigDialog().catch(handleError)
        else closePanel()
    })
    on(refreshButton, 'click', () => { dismissError(); refreshPorts().catch(handleError) })
    on(portSelect, 'change', async () => {
        const id = portSelect.value
        connecting = true
        portSelect.disabled = true
        refreshButton.disabled = true
        setStatus(id ? 'connecting' : 'disconnecting')
        dismissError()
        try { await ports.selectPort(id) }
        catch (error) { handleError(error) }
        finally {
            connecting = false
            if (!disposed) refreshPorts().catch(handleError)
        }
    })
    on(closeButton, 'click', closePanel)
    on(required('oops-close'), 'click', dismissError)
    if (document.defaultView) on(document.defaultView, 'keydown', (/** @type {KeyboardEvent} */ event) => {
        if (event.key === 'Escape' && !config.hidden) {
            event.preventDefault()
            if (!required('oops').hidden) dismissError()
            else closePanel()
            return
        }
        if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === ',' || event.code === 'Comma')) {
            event.preventDefault()
            showConfigDialog().catch(handleError)
        }
        if (!(event.ctrlKey || event.metaKey) && event.altKey) {
            if (event.key === 's' || event.code === 'KeyS') store.updateState({ sharp: !store.getState('sharp') })
            else {
                const color = colorSchemes.find(({ key, code }) => key === event.key || code === event.code)
                if (color) store.updateState({ colorScheme: color.id })
            }
        }
    })
    function render() {
        const state = store.getStateAll()
        locale = resolveLocale(state.language, browserLanguages())
        if (locale !== renderedLocale) {
            t = createTranslator(locale)
            translateDocument(document, locale)
            status.textContent = t(statusKey, statusParams)
            if (currentErrorKey) required('oops-message').textContent = t(currentErrorKey)
            if (offset.hasAttribute('aria-invalid')) offsetError.textContent = t('offsetError')
            portSelect.title = portSelect.selectedOptions[0]?.textContent ?? ''
            renderedLocale = locale
        }
        select('state-language').value = state.language
        for (const key of /** @type {const} */ (['sharp', 'useDegree', 'showToolbar', 'ignoreOctave'])) input(`state-${key}`).checked = state[key]
        select('state-key').value = String(state.key)
        select('state-mode').value = String(state.mode)
        const activeColor = colorSchemes.find(({ id }) => id === state.colorScheme)
        if (activeColor) {
            if (colorScheme.dataset.category !== activeColor.category) {
                colorScheme.replaceChildren()
                for (const scheme of colorSchemes.filter(({ category }) => category === activeColor.category)) {
                    const option = document.createElement('option')
                    option.value = scheme.id
                    colorScheme.append(option)
                }
                colorScheme.dataset.category = activeColor.category
            }
            for (const option of colorScheme.options) {
                const scheme = colorSchemes.find(({ id }) => id === option.value)
                if (scheme) option.textContent = t(`color.${scheme.id}`)
            }
            colorCategory.value = activeColor.category
            colorScheme.value = activeColor.id
            colorScheme.title = `${t(`color.${activeColor.id}`)} (Alt+${activeColor.key})`
            required('color-detail').hidden = activeColor.category === 'monotone'
            required('color-detail-label').textContent = t(activeColor.category === 'interval' ? 'colorPeriod' : 'colorMethod')
            required('color-help').textContent = t(activeColor.category === 'interval' ? 'colorIntervalHelp' : activeColor.id === 'axis' ? 'colorAxisHelp' : activeColor.id === 'fifth' ? 'colorCircleHelp' : 'colorMonotoneHelp')
        }
        const family = families.find(({ variants }) => variants.includes(state.noteArrangement))
        if (family) {
            for (const group of arrangement.querySelectorAll('optgroup')) {
                const definition = arrangementGroups.find(({ id }) => id === group.dataset.group)
                if (definition) group.label = t(`arrangementGroup.${definition.id}`)
            }
            arrangement.value = family.id
            arrangement.title = t(`layout.${family.id}`)
            if (arrangementVariant.dataset.family !== family.id) {
                arrangementVariant.replaceChildren()
                for (const id of family.variants) {
                    const option = document.createElement('option')
                    option.value = id
                    arrangementVariant.append(option)
                }
                arrangementVariant.dataset.family = family.id
            }
            for (const option of arrangementVariant.options) {
                const variant = option.value === family.id ? 'standard' : option.value.endsWith('-wide') ? 'wide' : option.value.endsWith('-tall') ? 'tall' : 'slanted'
                option.textContent = t(`arrangementVariant.${variant}`)
            }
            arrangementVariant.value = state.noteArrangement
            required('arrangement-detail').hidden = family.variants.length === 1
            required('arrangement-help').textContent = t(/** @type {import('./i18n.js').MessageKey} */ (`layoutHelp.${family.id}`))
        }
        if (document.activeElement !== offset && !offset.hasAttribute('aria-invalid')) resetOffset()
        required('toolbar').classList.toggle('shown', state.showToolbar)
    }
    if (document.defaultView) on(document.defaultView, 'languagechange', render)
    render()
    disposers.push(store.subscribeState(render))
    return { render, showConfigDialog, refreshPorts, handleError, dispose() { disposed = true; request++; disposers.forEach(dispose => dispose()) } }
}
