import { EventEmitter } from "events"
const storageKey = "midivisAppState"

const emitter = new EventEmitter()

/**
 * @typedef State
 * @property {boolean} sharp
 * @property {ColorScheme} colorScheme
 * @property {string | null} midiInputPortName
 * @property {boolean} showToolbar
 * @property {NoteArrangement} noteArrangement
 * @property {number} key
 * @property {number} mode
 * @property {boolean} useDegree
 * @property {number[]} noteOffsets
 */
const state = /** @type {State} */ ({
    sharp: false,
    colorScheme: "monotone",
    midiInputPortName: null,
    showToolbar: true,
    noteArrangement: "fourth",
    key: 0,
    mode: 2741,
    useDegree: false,
    noteOffsets: [],
})

/**
 * @template {keyof State} K
 * @param {K} key
 * @returns {State[K]}
 */
export function getState(key) {
    // @ts-ignore
    return structuredClone(state[key])
}

export function getStateAll() {
    return Object.assign({}, state)
}

/**
 * @param {() => void} callback 
 */
export function subscribeState(callback) {
    emitter.on("change", callback)
}

/**
 * @param {() => void} callback 
 */
export function unsubscribeState(callback) {
    emitter.off("change", callback)
}

export async function loadState() {
    const json = localStorage.getItem(storageKey)
    if (json) {
        try {
            const newState = JSON.parse(json)
            Object.assign(state, newState)
            return
        } catch (error) {
            console.error(error)
        }
    }
}

function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state))
}

/**
 * 
 * @param {Partial<State>} newState 
 */
export function updateState(newState) {
    Object.assign(state, newState)
    emitter.emit("change")
    saveState()
}
