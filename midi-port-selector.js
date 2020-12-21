const midi = require("midi")
const { EventEmitter } = require("events")

function portNames(midiio) {
    const nPorts = midiio.getPortCount()
    const portNames = []
    for (let i = 0; i < nPorts; i++) {
        const portName = midiio.getPortName(i)
        portNames.push(portName)
    }
    return portNames
}

function findPortByName(name, midiio) {
    const nPorts = midiio.getPortCount()
    for (let i = 0; i < nPorts; i++) {
        const portName = midiio.getPortName(i)
        if (portName === name) {
            return i
        }
    }
    return -1
}

class MidiInputPortSelector extends EventEmitter {
    #emitMessage
    #input
    #currentName
    constructor(options) {
        super(options)
        this.#emitMessage = (deltaTime, message) => {
            return this.emit("message", deltaTime, message)
        }
    }
    #unconnect() {
        if (this.#input) {
            this.#input.off("message", this.#emitMessage)
            this.#input.closePort()
            this.#input = undefined
            this.#currentName = undefined
        }
    }
    #connect(port) {
        this.#unconnect()
        const input = new midi.Input()
        const nPorts = input.getPortCount()
        if (Number.isSafeInteger(port) && port >= 0 && port < nPorts) {
            const name = input.getPortName(port)
            input.openPort(port)
            this.#input = input
            this.#currentName = name
            this.#input.on("message", this.#emitMessage)
            return true
        }
        return false
    }
    openPortByName(name) {
        return this.#connect(findPortByName(name, new midi.Input()))
    }
    closePort() {
        this.#unconnect()
    }
    portOptions() {
        return portNames(new midi.Input()).map(name => ({
            name,
            selected: name === this.#currentName
        }))
    }
}

module.exports = { MidiInputPortSelector }
