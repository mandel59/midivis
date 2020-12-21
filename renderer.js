const { ipcRenderer } = require("electron")
const { ChordPrinter } = require("./chord-printer")
const { ChordVisualizer } = require("./chord-visualizer")
const { getState, subscribeState, loadState, updateState } = require("./state")

const indicator = document.getElementById("chordindicator")
const element = document.getElementById("chordvis")

loadState()

const printer = new ChordPrinter(0, {
    onChordChange: (chord) => {
        if (chord) {
            indicator.innerText = chord
        }
    },
    sharp: getState("sharp")
})
const visualizer = new ChordVisualizer(element, { sharp: getState("sharp") })

subscribeState(() => {
    const sharp = getState("sharp")
    const colorScheme = getState("colorScheme")
    printer.sharp = sharp
    visualizer.updateOptions({
        sharp,
        colorScheme,
    })
})

if (!getState("midiInputPortName")) {
    showConfigDialog()
}

ipcRenderer.on("update", (event, newState) => {
    updateState(newState)
})

ipcRenderer.on("midiMessage", (event, deltaTime, message) => {
    printer.midiMessageHandler(deltaTime, message)
    visualizer.midiMessageHandler(deltaTime, message)
})

const config = document.getElementById("config")
/** @type {HTMLSelectElement} */
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
    const midiInputPortName = midiInputPortSelector.value
    if (midiInputPortName) {
        ipcRenderer.invoke("openInputPortByName", midiInputPortName)
            .then(ok => {
                if (ok) {
                    updateState({ midiInputPortName })
                }
            })
    } else {
        ipcRenderer.invoke("closeInputPort")
        updateState({ midiInputPortName: null })
    }
})

const closeConfigButton = document.getElementById("config-close")
closeConfigButton.addEventListener("click", () => {
    config.classList.remove("shown")
})
