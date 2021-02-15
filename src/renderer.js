require("./assets")
require("./register-service-worker")

const {
    getInputPortOptions,
    subscribeMIDIMessage,
    openInputPortByName,
    closeInputPort,
} = require("./midi-bridge")
const { ChordPrinter } = require("./chord-printer")
const { ChordVisualizer } = require("./chord-visualizer")
const { getState, subscribeState, loadState, updateState } = require("./state")
const { colorSchemes } = require("./color-scheme")
const { noteArrangements } = require("./note-arrangement")

const indicator = document.getElementById("chordindicator")
const element = document.getElementById("chordvis")

const printer = new ChordPrinter(0, {
    onChordChange: (chord) => {
        if (chord) {
            indicator.innerText = chord
        }
    },
    sharp: getState("sharp")
})
const visualizer = new ChordVisualizer(element, { sharp: getState("sharp") })

document.getElementById("state-sharp")?.addEventListener("change", (ev) => {
    updateState({ sharp: ev.target.checked })
})

document.getElementById("state-showToolbar")?.addEventListener("change", (ev) => {
    updateState({ showToolbar: ev.target.checked })
})

const configColorScheme = document.getElementById("config-colorScheme")

colorSchemes.forEach(({ id, label, key }) => {
    const e = document.createElement("input")
    e.type = "radio"
    e.id = `state-colorScheme-${id}`
    e.name = "state-colorScheme"
    e.value = id
    e.addEventListener("change", (ev) => {
        updateState({ colorScheme: ev.target.value })
    })
    const l = document.createElement("label")
    l.appendChild(e)
    l.appendChild(document.createTextNode(`${label} (Alt+${key})`))
    configColorScheme.appendChild(l)
})

const configNoteArrangement = document.getElementById("config-noteArrangement")

noteArrangements.forEach(({ id, label }) => {
    const e = document.createElement("input")
    e.type = "radio"
    e.id = `state-noteArrangement-${id}`
    e.name = "state-noteArrangement"
    e.value = id
    e.addEventListener("change", (ev) => {
        updateState({ noteArrangement: ev.target.value })
    })
    const l = document.createElement("label")
    l.appendChild(e)
    l.appendChild(document.createTextNode(`${label}`))
    configNoteArrangement.appendChild(l)
})

function reflectState() {
    const sharp = getState("sharp")
    const colorScheme = getState("colorScheme")
    const noteArrangement = getState("noteArrangement")
    const midiInputPortName = getState("midiInputPortName")
    const showToolbar = getState("showToolbar")
    printer.sharp = sharp
    visualizer.updateOptions({
        sharp,
        colorScheme,
        noteArrangement,
    })
    /** @type {HTMLInputElement} */
    const inputSharp = document.getElementById("state-sharp")
    if (inputSharp) inputSharp.checked = sharp
    /** @type {HTMLInputElement} */
    const inputColorScheme = document.getElementById(`state-colorScheme-${colorScheme}`)
    if (inputColorScheme) inputColorScheme.checked = true
    /** @type {HTMLInputElement} */
    const inputNoteArrangement = document.getElementById(`state-noteArrangement-${noteArrangement}`)
    if (inputNoteArrangement) inputNoteArrangement.checked = true
    if (midiInputPortName) {
        openInputPortByName(midiInputPortName).then(ok => {
            if (!ok) {
                showConfigDialog()
            }
        })
    }
    /** @type {HTMLInputElement} */
    const inputShowToolbar = document.getElementById("state-showToolbar")
    if (inputShowToolbar) inputShowToolbar.checked = showToolbar
    if (showToolbar) {
        document.getElementById("toolbar")?.classList.add("shown")
    } else {
        document.getElementById("toolbar")?.classList.remove("shown")
    }
}

subscribeState(() => {
    reflectState()
})

loadState().then(() => {
    reflectState()
    const midiInputPortName = getState("midiInputPortName")
    if (midiInputPortName) {
        openInputPortByName(midiInputPortName).then(ok => {
            if (!ok) {
                showConfigDialog()
            }
        })
    }
})

if (!getState("midiInputPortName")) {
    showConfigDialog()
}

subscribeMIDIMessage((deltaTime, message) => {
    printer.midiMessageHandler(deltaTime, message)
    visualizer.midiMessageHandler(deltaTime, message)
})

const config = document.getElementById("config")
/** @type {HTMLSelectElement} */
const midiInputPortSelector = document.getElementById("config-midi-input-port")

async function showConfigDialog() {
    const portOptions = await getInputPortOptions()
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

document.getElementById("menu-settings")?.addEventListener("click", () => {
    showConfigDialog()
})

midiInputPortSelector.addEventListener("change", () => {
    const midiInputPortName = midiInputPortSelector.value
    if (midiInputPortName) {
        openInputPortByName(midiInputPortName)
            .then(ok => {
                if (ok) {
                    updateState({ midiInputPortName })
                }
            })
    } else {
        closeInputPort()
        updateState({ midiInputPortName: null })
    }
})

const closeConfigButton = document.getElementById("config-close")
closeConfigButton.addEventListener("click", () => {
    config.classList.remove("shown")
})

window.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.key === ",") {
        showConfigDialog()
    }
    if (!(ev.ctrlKey || ev.metaKey) && ev.altKey) {
        if (ev.key === "s") {
            updateState({ sharp: !getState("sharp") })
        } else {
            const colorScheme = colorSchemes.find(({ key }) => key === ev.key)
            if (colorScheme) {
                updateState({ colorScheme: colorScheme.id })
            }
        }
    }
})
