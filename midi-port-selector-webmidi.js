const { EventEmitter } = require("events")

function requestMIDIAccess() {
    return navigator.requestMIDIAccess({
        sysex: false,
        software: false,
    })
}

class MidiInputPortSelector extends EventEmitter {
    #emitMessage
    #input
    constructor(options) {
        super(options)
        this.#emitMessage = (event) => {
            const deltaTime = undefined
            const message = event.data
            return this.emit("message", deltaTime, message)
        }
    }
    async #unconnect() {
        if (this.#input) {
            const input = this.#input
            this.#input = undefined
            input.removeEventListener("midimessage", this.#emitMessage)
            await input.close()
        }
    }
    async #connect(port) {
        const midiAccess = await requestMIDIAccess()
        for (const input of midiAccess.inputs.values()) {
            if (port === (input.name || input.id)) {
                await input.open()
                while (this.#input) {
                    await this.#unconnect()
                }
                this.#input = input
                this.#input.addEventListener("midimessage", this.#emitMessage)
                return true
            }
        }
        return false
    }
    async openPortByName(name) {
        return this.#connect(name)
    }
    async closePort() {
        return this.#unconnect()
    }
    async portOptions() {
        const midiAccess = await requestMIDIAccess()
        const ports = Array.from(midiAccess.inputs.values())
        return ports.map(port => ({
            name: port.name || port.id,
            selected: this.#input != null && port.id === this.#input.id
        }))
    }
}

module.exports = { MidiInputPortSelector }
