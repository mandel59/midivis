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
if (indicator == null) {
    throw new Error("#chordindicator not found")
}
if (element == null) {
    throw new Error("#chordvis not found")
}

const printer = new ChordPrinter(0, {
    onChordChange: (chord) => {
        if (chord) {
            indicator.innerText = chord
        }
    },
    sharp: getState("sharp"),
    useDegree: getState("useDegree"),
    scaleKey: getState("key"),
})

const visualizer = new ChordVisualizer(element, {
    sharp: getState("sharp"),
    key: getState("key"),
})

// Gb Db Ab Eb Bb F C G D A E B
const modeShapeCode = [6, 1, 8, 3, 10, 5, 0, 7, 2, 9, 4, 11]
const modeShapeBase = modeShapeCode.indexOf(0)

/**
 * @param {number} key 
 * @param {number} mode 
 * @param {boolean} [sharp]
 * @returns {boolean}
 */
function isSharpKey(key, mode, sharp = false) {
    const offset = modeShapeCode.indexOf(key) - modeShapeBase
    const left = modeShapeCode.findIndex(key => (mode >> key) & 1) - modeShapeBase
    sharp = left + offset === -7 ? sharp : (left + offset < -7 || left + offset >= 0)
    return sharp
}

document.getElementById("state-key")?.addEventListener("change", (ev) => {
    // @ts-ignore
    const key = Number(ev.target.value)
    const mode = getState("mode")
    const sharp = isSharpKey(key, mode, getState("sharp"))
    updateState({ key, sharp })
})

document.getElementById("state-mode")?.addEventListener("change", (ev) => {
    const key = getState("key")
    // @ts-ignore
    const mode = Number(ev.target.value)
    const sharp = isSharpKey(key, mode, getState("sharp"))
    updateState({ mode, sharp })
})

document.getElementById("state-sharp")?.addEventListener("change", (ev) => {
    // @ts-ignore
    updateState({ sharp: ev.target.checked })
})

document.getElementById("state-useDegree")?.addEventListener("change", (ev) => {
    // @ts-ignore
    updateState({ useDegree: ev.target.checked })
})

document.getElementById("state-showToolbar")?.addEventListener("change", (ev) => {
    // @ts-ignore
    updateState({ showToolbar: ev.target.checked })
})

document.getElementById("state-channel")?.addEventListener("change", (ev) => {
    reflectState()
})

document.getElementById("state-noteOffset")?.addEventListener("change", (ev) => {
    // @ts-ignore
    const channel = Number(document.getElementById("state-channel").value)
    const noteOffsets = getState("noteOffsets")
    // @ts-ignore
    noteOffsets[channel - 1] = Number(ev.target.value)
    updateState({ noteOffsets })
})

const configColorScheme = document.getElementById("config-colorScheme")
if (configColorScheme == null) {
    throw new Error("#config-colorScheme is not found")
}

colorSchemes.forEach(({ id, label, key }) => {
    const e = document.createElement("input")
    e.type = "radio"
    e.id = `state-colorScheme-${id}`
    e.name = "state-colorScheme"
    e.value = id
    e.addEventListener("change", (ev) => {
        // @ts-ignore
        updateState({ colorScheme: ev.target.value })
    })
    const l = document.createElement("label")
    l.appendChild(e)
    l.appendChild(document.createTextNode(`${label} (Alt+${key})`))
    configColorScheme.appendChild(l)
})

const configNoteArrangement = document.getElementById("config-noteArrangement")
if (configNoteArrangement == null) {
    throw new Error("#config-noteArrangement is not found")
}

const selectNoteArrangement = document.createElement("select")
selectNoteArrangement.id = "state-noteArrangement"
selectNoteArrangement.addEventListener("change", (ev) => {
    // @ts-ignore
    updateState({ noteArrangement: ev.target.value })
})

noteArrangements.forEach(({ id, label }) => {
    const opt = document.createElement("option")
    opt.value = id
    opt.appendChild(document.createTextNode(label))
    selectNoteArrangement.appendChild(opt)
})

configNoteArrangement.appendChild(selectNoteArrangement)

function reflectState() {
    const key = getState("key")
    const mode = getState("mode")
    const sharp = getState("sharp")
    const useDegree = getState("useDegree")
    const colorScheme = getState("colorScheme")
    const noteArrangement = getState("noteArrangement")
    const midiInputPortName = getState("midiInputPortName")
    const showToolbar = getState("showToolbar")
    const noteOffsets = getState("noteOffsets")
    printer.sharp = sharp
    printer.useDegree = useDegree
    printer.scaleKey = key
    visualizer.updateOptions({
        sharp,
        colorScheme,
        noteArrangement,
        key,
        mode,
    })
    for (let i = 0; i < 16; i++) {
        const offset = noteOffsets[i] ?? 0
        printer.setNoteOffset(offset, i + 1)
        visualizer.setNoteOffset(offset, i + 1)
    }
    const selectChannel = /** @type {HTMLSelectElement} */ (document.getElementById("state-channel"))
    const inputNoteOffset = /** @type {HTMLSelectElement} */ (document.getElementById("state-noteOffset"))
    if (selectChannel && inputNoteOffset) {
        const offset = noteOffsets[Number(selectChannel.value) - 1] ?? 0
        inputNoteOffset.value = String(offset)
    }
    const selectKey = /** @type {HTMLSelectElement} */ (document.getElementById("state-key"))
    if (selectKey) selectKey.value = String(key)
    const selectMode = /** @type {HTMLSelectElement} */ (document.getElementById("state-mode"))
    if (selectMode) selectMode.value = String(mode)
    const inputSharp = /** @type {HTMLInputElement} */ (document.getElementById("state-sharp"))
    if (inputSharp) inputSharp.checked = sharp
    const inputUseDegree = /** @type {HTMLInputElement} */ (document.getElementById("state-useDegree"))
    if (inputUseDegree) inputUseDegree.checked = useDegree
    const inputColorScheme = /** @type {HTMLInputElement} */ (document.getElementById(`state-colorScheme-${colorScheme}`))
    if (inputColorScheme) inputColorScheme.checked = true
    const inputNoteArrangement = /** @type {HTMLSelectElement} */ (document.getElementById(`state-noteArrangement`))
    if (inputNoteArrangement) inputNoteArrangement.value = noteArrangement
    if (midiInputPortName) {
        openInputPortByName(midiInputPortName).then(ok => {
            if (!ok) {
                return showConfigDialog()
            }
        }).catch(handleError)
    }
    const inputShowToolbar = /** @type {HTMLInputElement} */ (document.getElementById("state-showToolbar"))
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
                return showConfigDialog()
            }
        }).catch(handleError)
    }
})

if (!getState("midiInputPortName")) {
    showConfigDialog().catch(handleError)
}

subscribeMIDIMessage((deltaTime, message) => {
    printer.midiMessageHandler(deltaTime, message)
    visualizer.midiMessageHandler(deltaTime, message)
})

const config = document.getElementById("config")
if (config == null) {
    throw new Error("#config not found")
}
const midiInputPortSelector = /** @type {HTMLSelectElement} */ (document.getElementById("config-midi-input-port"))
if (midiInputPortSelector == null) {
    throw new Error("#config-midi-input-port not found")
}

async function showConfigDialog() {
    if (config == null) {
        throw new Error("#config not found")
    }
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
    showConfigDialog().catch(handleError)
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
if (closeConfigButton == null) {
    throw new Error("#config-close not found")
}
closeConfigButton.addEventListener("click", () => {
    config.classList.remove("shown")
})

const oops = document.getElementById("oops")

/**
 * @param {string} message 
 */
async function showOopsDialog(message) {
    if (oops == null) {
        throw new Error("#oops not found")
    }
    const messageBox = document.getElementById("oops-message")
    if (messageBox) {
        messageBox.innerText = message
    }
    oops.classList.add("shown")
}

const closeOopsButton = document.getElementById("oops-close")
if (closeOopsButton == null) {
    throw new Error("#oops-close not found")
}
closeOopsButton.addEventListener("click", () => {
    if (oops == null) {
        throw new Error("#oops not found")
    }
    oops.classList.remove("shown")
})

/**
 * @param {*} err 
 */
function handleError(err) {
    console.error(err)
    if (err != null && "message" in err) {
        const message = err.message
        showOopsDialog(message)
    }
}

window.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === "," || ev.code === "Comma")) {
        showConfigDialog().catch(handleError)
    }
    if (!(ev.ctrlKey || ev.metaKey) && ev.altKey) {
        if (ev.key === "s" || ev.code === "KeyS") {
            updateState({ sharp: !getState("sharp") })
        } else {
            const colorScheme = colorSchemes.find(({ key, code }) => key === ev.key || code === ev.code)
            if (colorScheme) {
                updateState({ colorScheme: colorScheme.id })
            }
        }
    }
})
