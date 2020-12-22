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
