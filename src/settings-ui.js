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
        text.append(radio, document.createTextNode(`${label} (Alt+${key})`))
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
    on(select('state-channel'), 'change', () => render())
    on(input('state-noteOffset'), 'change', () => {
        const noteOffsets = store.getState('noteOffsets')
        noteOffsets[Number(select('state-channel').value) - 1] = Number(input('state-noteOffset').value)
        store.updateState({ noteOffsets })
        render()
    })
    /** @param {unknown} error */
    function handleError(error) {
        console.error(error)
        required('oops-message').textContent = error instanceof Error ? error.message : String(error)
        required('oops').classList.add('shown')
    }
    async function showConfigDialog() {
        config.classList.add('shown')
        const options = await ports.listPorts()
        portSelect.replaceChildren()
        const placeholder = document.createElement('option')
        placeholder.value = ''
        placeholder.textContent = 'Select MIDI input port'
        portSelect.append(placeholder)
        for (const { id, name, selected } of options) {
            const option = document.createElement('option')
            option.value = id
            option.textContent = name
            option.selected = selected
            portSelect.append(option)
        }
    }
    on(required('menu-settings'), 'click', () => showConfigDialog().catch(handleError))
    on(portSelect, 'change', () => ports.selectPort(portSelect.value).catch(handleError))
    on(required('config-close'), 'click', () => config.classList.remove('shown'))
    on(required('oops-close'), 'click', () => required('oops').classList.remove('shown'))
    if (document.defaultView) on(document.defaultView, 'keydown', (/** @type {KeyboardEvent} */ event) => {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === ',' || event.code === 'Comma')) {
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
        input('state-noteOffset').value = String(state.noteOffsets[Number(select('state-channel').value) - 1] ?? 0)
        required('toolbar').classList.toggle('shown', state.showToolbar)
    }
    render()
    disposers.push(store.subscribeState(render))
    return { render, showConfigDialog, handleError, dispose() { disposers.forEach(dispose => dispose()) } }
}
