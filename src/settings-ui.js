import { colorSchemes } from './color-scheme.js'
import { noteArrangements } from './note-arrangement.js'
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
    const config = required('config')
    const portSelect = select('config-midi-input-port')
    const colorContainer = required('config-colorScheme')
    colorContainer.replaceChildren()
    for (const { id, label, key } of colorSchemes) {
        const radio = document.createElement('input')
        radio.type = 'radio'
        radio.id = `state-colorScheme-${id}`
        radio.name = 'state-colorScheme'
        radio.value = id
        on(radio, 'change', () => store.updateState({ colorScheme: id }))
        const text = document.createElement('label')
        text.title = `Alt+${key}`
        text.append(radio, document.createTextNode(label))
        colorContainer.append(text)
    }
    const arrangement = document.createElement('select')
    arrangement.id = 'state-noteArrangement'
    for (const { id, label } of noteArrangements) {
        const option = document.createElement('option')
        option.value = id
        option.textContent = label
        arrangement.append(option)
    }
    required('config-noteArrangement').replaceChildren(arrangement)
    on(arrangement, 'change', () => {
        const layout = noteArrangements.find(({ id }) => id === arrangement.value)
        if (layout) store.updateState({ noteArrangement: layout.id })
    })
    for (const key of /** @type {const} */ (['sharp', 'useDegree', 'showToolbar'])) {
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
            offsetError.textContent = 'Enter a whole number from −24 to +24. The previous setting is still applied.'
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
        required('oops-message').textContent = error instanceof Error ? error.message : String(error)
        required('oops').hidden = false
        required('oops').classList.add('shown')
        required('oops').scrollIntoView?.({ block: 'nearest' })
    }
    function dismissError() {
        required('oops').hidden = true
        required('oops').classList.remove('shown')
        if (required('oops').contains(document.activeElement)) closeButton.focus()
    }
    async function refreshPorts() {
        const current = ++request
        if (!connecting) status.textContent = 'Checking MIDI inputs…'
        portSelect.disabled = true
        refreshButton.disabled = true
        try {
            const options = await ports.listPorts()
            if (disposed || current !== request) return
            portSelect.replaceChildren()
            const placeholder = document.createElement('option')
            placeholder.value = ''
            placeholder.textContent = 'Not connected'
            portSelect.append(placeholder)
            for (const { id, name, selected } of options) {
                const option = document.createElement('option')
                option.value = id
                option.textContent = options.filter(port => port.name === name).length > 1 ? `${name} (${id})` : name
                option.selected = selected
                portSelect.append(option)
            }
            const active = options.find(port => port.selected)
            if (!connecting) status.textContent = active ? `Connected: ${active.name}` :
                options.length ? 'Not connected. Choose an input device.' : 'No MIDI inputs found. Connect a device, then refresh.'
            portSelect.title = portSelect.selectedOptions[0]?.textContent ?? ''
        } catch (error) {
            if (disposed || current !== request) return
            status.textContent = 'MIDI inputs unavailable. Check permissions and try Refresh inputs.'
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
        status.textContent = id ? 'Connecting…' : 'Disconnecting…'
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
        for (const key of /** @type {const} */ (['sharp', 'useDegree', 'showToolbar'])) input(`state-${key}`).checked = state[key]
        select('state-key').value = String(state.key)
        select('state-mode').value = String(state.mode)
        input(`state-colorScheme-${state.colorScheme}`).checked = true
        arrangement.value = state.noteArrangement
        if (document.activeElement !== offset && !offset.hasAttribute('aria-invalid')) resetOffset()
        required('toolbar').classList.toggle('shown', state.showToolbar)
    }
    render()
    disposers.push(store.subscribeState(render))
    return { render, showConfigDialog, refreshPorts, handleError, dispose() { disposed = true; request++; disposers.forEach(dispose => dispose()) } }
}
