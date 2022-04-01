const { EventEmitter } = require("events")

async function requestMIDIAccess() {
    if (!("requestMIDIAccess" in navigator)) {
        const err = new Error("Web MIDI API is not available. See https://caniuse.com/midi for browsers supporting Web MIDI.")
        throw err
    }
    // @ts-ignore
    return await navigator.requestMIDIAccess({
        sysex: false,
        software: false,
    })
}

class MidiInputPortSelector extends EventEmitter {
    /**
     * @param {*} [options] 
     */
    constructor(options) {
        super(options)
        this._emitMessage = (/** @type {*} */ event) => {
            const deltaTime = undefined
            const message = event.data
            return this.emit("message", deltaTime, message)
        }
    }
    async _unconnect() {
        if (this._input) {
            const input = this._input
            this._input = undefined
            input.removeEventListener("midimessage", this._emitMessage)
            await input.close()
        }
    }
    /**
     * @param {string} port 
     */
    async _connect(port) {
        const midiAccess = await requestMIDIAccess()
        for (const input of midiAccess.inputs.values()) {
            if (port === (input.name || input.id)) {
                await input.open()
                while (this._input) {
                    await this._unconnect()
                }
                this._input = input
                this._input.addEventListener("midimessage", this._emitMessage)
                return true
            }
        }
        return false
    }
    /**
     * @param {string} name 
     */
    async openPortByName(name) {
        return this._connect(name)
    }
    async closePort() {
        return this._unconnect()
    }
    async portOptions() {
        const midiAccess = await requestMIDIAccess()
        const ports = Array.from(midiAccess.inputs.values())
        return ports.map(port => ({
            name: port.name || port.id,
            selected: this._input != null && port.id === this._input.id
        }))
    }
}

module.exports = { MidiInputPortSelector }
