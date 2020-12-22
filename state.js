const { sendStateLoaded } = require("./state-bridge")
const { EventEmitter } = require("events")
const storageKey = "midivisAppState"

const emitter = new EventEmitter()

/**
 * @typedef State
 * @property {boolean} sharp
 * @property {"monotone" | "chromatic" | "fifth" | "axis" | "quintave"} colorScheme
 * @property {string | null} midiInputPortName
 */
const state = /** @type {State} */ ({
    sharp: false,
    colorScheme: "monotone",
    midiInputPortName: null
})

/**
 * @template {keyof State} K
 * @param {K} key
 * @returns {State[K]}
 */
function getState(key) {
    return state[key]
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
function unsubscribeState(key, callback) {
    emitter.off("change", callback)
}

function loadState() {
    const json = localStorage.getItem(storageKey)
    if (json) {
        try {
            const newState = JSON.parse(json)
            Object.assign(state, newState)
            sendStateLoaded(state)
            return
        } catch (error) {
            console.error(error)
        }
    }
}

function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state))
}

function updateState(newState) {
    Object.assign(state, newState)
    emitter.emit("change")
    saveState()
}

module.exports = {
    getState,
    subscribeState,
    unsubscribeState,
    updateState,
    loadState,
}
