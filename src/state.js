const { EventEmitter } = require("events")
const storageKey = "midivisAppState"

const emitter = new EventEmitter()

/**
 * @typedef State
 * @property {boolean} sharp
 * @property {"monotone" | "chromatic" | "fifth" | "axis" | "quintave" | "third-major"} colorScheme
 * @property {string | null} midiInputPortName
 * @property {boolean} showToolbar
 * @property {"fourth" | "tritone" | "c-system" | "b-system" | "wicki-hayden" | "wicki-hayden-wide" | "tonnetz" | "janko"} noteArrangement
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
function getState(key) {
    return structuredClone(state[key])
}

function getStateAll() {
    return Object.assign({}, state)
}

/**
 * @param {() => void} callback 
 */
function subscribeState(callback) {
    emitter.on("change", callback)
}

/**
 * @param {() => void} callback 
 */
function unsubscribeState(callback) {
    emitter.off("change", callback)
}

async function loadState() {
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
function updateState(newState) {
    Object.assign(state, newState)
    emitter.emit("change")
    saveState()
}

module.exports = {
    getState,
    getStateAll,
    subscribeState,
    unsubscribeState,
    updateState,
    loadState,
}
