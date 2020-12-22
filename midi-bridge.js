const { useElectron } = require("./env")

if (useElectron) {
    const { ipcRenderer } = require("electron")

    /**
     * @returns {Promise<Array<{name: string, selected: boolean}>>}
     */
    function getInputPortOptions() {
        return ipcRenderer.invoke("getInputPortOptions")
    }

    /**
     * 
     * @param {(deltaTime: number, message: number[]) => void} callback 
     */
    function subscribeMIDIMessage(callback) {
        ipcRenderer.on("midiMessage", (event, deltaTime, message) => {
            callback(deltaTime, message)
        })
    }

    /**
     * 
     * @param {string} midiInputPortName 
     * @returns {Promise<boolean>}
     */
    function openInputPortByName(midiInputPortName) {
        return ipcRenderer.invoke("openInputPortByName", midiInputPortName)
    }

    function closeInputPort() {
        return ipcRenderer.invoke("closeInputPort")
    }

    module.exports = {
        getInputPortOptions,
        subscribeMIDIMessage,
        openInputPortByName,
        closeInputPort,
    }
} else {
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
}
