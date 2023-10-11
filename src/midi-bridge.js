import { MidiInputPortSelector } from "./midi-port-selector-webmidi"
const input = new MidiInputPortSelector()
/**
 * @returns {Promise<Array<{name: string, selected: boolean}>>}
 */
export function getInputPortOptions() {
    return input.portOptions()
}

/**
 * 
 * @param {(deltaTime: number, message: [number, number, number]) => void} callback 
 */
export function subscribeMIDIMessage(callback) {
    input.on("message", callback)
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
