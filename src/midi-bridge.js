import { MidiInputPortSelector } from "./midi-port-selector-webmidi.js"
const input = new MidiInputPortSelector()
/**
 * @returns {Promise<Array<{id: string, name: string, selected: boolean}>>}
 */
export function getInputPortOptions() {
    return input.portOptions()
}

/**
 * 
 * @param {(timestamp: number, message: Uint8Array) => void} callback 
 */
export function subscribeMIDIMessage(callback) {
    input.on("message", callback)
    return () => { input.off("message", callback) }
}

/**
 * 
 * @param {string} midiInputPortName 
 * @returns {Promise<boolean>}
 */
export function openInputPortByName(midiInputPortName) {
    return input.openPortByName(midiInputPortName)
}

export function closeInputPort() {
    return input.closePort()
}
