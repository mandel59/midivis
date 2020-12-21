const { ipcRenderer } = require("electron")
const { ChordPrinter } = require("./chord-printer")
const { ChordVisualizer } = require("./chord-visualizer")

/**
 * @typedef State
 * @property {boolean} sharp
 * @property {"monotone" | "chromatic" | "fifth" | "axis" | "quintave"} colorScheme
 */
const state = /** @type {State} */ ({
    sharp: false,
    colorScheme: "monotone"
})

const indicator = document.getElementById("chordindicator")
const element = document.getElementById("chordvis")

const printer = new ChordPrinter(0, {
    onChordChange: (chord) => {
        if (chord) {
            indicator.innerText = chord
        }
    },
    sharp: state.sharp
})

const visualizer = new ChordVisualizer(element, { sharp: state.sharp })

const storageKey = "midivisAppState"

function loadState() {
    const json = localStorage.getItem(storageKey)
    if (json) {
        try {
            updateState(JSON.parse(json))
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
    console.log("updateState", newState)
    Object.assign(state, newState)
    printer.sharp = state.sharp
    visualizer.updateOptions({
        sharp: state.sharp,
        colorScheme: state.colorScheme,
    })
    saveState()
}

loadState()

ipcRenderer.on("update", (event, newState) => {
    updateState(newState)
})

ipcRenderer.on("midiMessage", (event, deltaTime, message) => {
    printer.midiMessageHandler(deltaTime, message)
    visualizer.midiMessageHandler(deltaTime, message)
})

const config = document.getElementById("config")
const midiInputPortSelector = document.getElementById("config-midi-input-port")

async function showConfigDialog() {
    const portOptions = await ipcRenderer.invoke("getInputPortOptions")
    midiInputPortSelector.innerHTML = ""
    const dummyOption = document.createElement("option")
    dummyOption.innerText = "Select MIDI input port"
    dummyOption.value = ""
    midiInputPortSelector.appendChild(dummyOption)
    for (const { name, selected } of portOptions) {
        const option = document.createElement("option")
        option.innerText = name
        option.value = name
        midiInputPortSelector.appendChild(option)
        if (selected) {
            option.selected = true
        }
    }
    config.classList.add("shown")
}

ipcRenderer.on("showConfigDialog", (event) => {
    showConfigDialog()
})

midiInputPortSelector.addEventListener("change", () => {
    const name = midiInputPortSelector.value
    if (name) {
        ipcRenderer.invoke("useInputPortByName", name)
    }
})

const closeConfigButton = document.getElementById("config-close")
closeConfigButton.addEventListener("click", () => {
    config.classList.remove("shown")
})
