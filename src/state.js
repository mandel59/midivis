import { colorSchemes } from './color-scheme.js'
import { noteArrangements } from './note-arrangement.js'

export const storageKey = "midivisAppState"
/**
 * @typedef {object} State
 * @property {import('./i18n.js').LanguagePreference} language
 * @property {boolean} ignoreOctave
 * @property {boolean} sharp
 * @property {ColorScheme} colorScheme
 * @property {string | null} midiInputPortName Legacy names are accepted; new selections save IDs.
 * @property {boolean} showToolbar
 * @property {NoteArrangement} noteArrangement
 * @property {number} key
 * @property {number} mode
 * @property {boolean} useDegree
 * @property {number[]} noteOffsets
 */
/** @returns {State} */
export function defaultState() {
    return { language: 'auto', ignoreOctave: false, sharp: false, colorScheme: 'monotone', midiInputPortName: null,
        showToolbar: true, noteArrangement: 'fourth', key: 0, mode: 2741,
        useDegree: false, noteOffsets: [] }
}
/** @param {unknown} value @param {number} min @param {number} max @returns {value is number} */
const integerIn = (value, min, max) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

/** Validate untrusted persisted data field by field. @param {unknown} value @returns {State} */
export function normalizeState(value) {
    const state = defaultState()
    if (!value || typeof value !== 'object' || Array.isArray(value)) return state
    const data = /** @type {Record<string, unknown>} */ (value)
    if (data.language === 'en' || data.language === 'ja') state.language = data.language
    if (typeof data.ignoreOctave === 'boolean') state.ignoreOctave = data.ignoreOctave
    if (typeof data.sharp === 'boolean') state.sharp = data.sharp
    if (typeof data.showToolbar === 'boolean') state.showToolbar = data.showToolbar
    if (typeof data.useDegree === 'boolean') state.useDegree = data.useDegree
    const color = colorSchemes.find(({ id }) => id === data.colorScheme)
    if (color) state.colorScheme = color.id
    const layout = noteArrangements.find(({ id }) => id === data.noteArrangement)
    if (layout) state.noteArrangement = layout.id
    if (typeof data.midiInputPortName === 'string' && data.midiInputPortName) state.midiInputPortName = data.midiInputPortName
    if (integerIn(data.key, 0, 11)) state.key = data.key
    if (integerIn(data.mode, 0, 4095)) state.mode = data.mode
    if (Array.isArray(data.noteOffsets)) {
        state.noteOffsets = Array.from(data.noteOffsets.slice(0, 16), offset => integerIn(offset, -24, 24) ? offset : 0)
    }
    return state
}

/**
 * Storage access is lazy so SecurityError is handled like any other I/O failure.
 * @param {{storage?: Pick<Storage, 'getItem' | 'setItem'>, onError?: (error: unknown) => void}} [options]
 */
export function createStateStore({ storage = {
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
}, onError = error => console.error(error) } = {}) {
    let state = defaultState()
    /** @type {Set<() => void>} */
    const listeners = new Set()
    return {
        /** @template {keyof State} K @param {K} key @returns {State[K]} */
        getState(key) { return structuredClone(state[key]) },
        getStateAll() { return structuredClone(state) },
        /** @param {() => void} callback */
        subscribeState(callback) {
            listeners.add(callback)
            return () => { listeners.delete(callback) }
        },
        async loadState() {
            try {
                const json = storage.getItem(storageKey)
                state = normalizeState(json ? JSON.parse(json) : null)
            } catch (error) {
                state = defaultState()
                onError(error)
            }
        },
        /** @param {Partial<State>} patch */
        updateState(patch) {
            const next = normalizeState({ ...state, ...patch })
            if (JSON.stringify(next) === JSON.stringify(state)) return
            state = next
            try { storage.setItem(storageKey, JSON.stringify(state)) }
            catch (error) { onError(error) }
            for (const listener of listeners) listener()
        },
    }
}
