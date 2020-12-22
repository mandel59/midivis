const { MidiInputPortSelector } = require("./midi-port-selector-webmidi")
const input = new MidiInputPortSelector()
/**
 * @returns {Promise<Array<{name: string, selected: boolean}>>}
 */
function getInputPortOptions() {
    return input.portOptions()
}

/**
 * 
 * @param {(deltaTime: number, message: number[]) => void} callback 
 */
function subscribeMIDIMessage(callback) {
    input.on("message", callback)
}

/**
 * 
 * @param {string} midiInputPortName 
 * @returns {Promise<boolean>}
 */
function openInputPortByName(midiInputPortName) {
    return input.openPortByName(midiInputPortName)
}

function closeInputPort() {
    return input.closePort()
}

module.exports = {
    getInputPortOptions,
    subscribeMIDIMessage,
    openInputPortByName,
    closeInputPort,
}
