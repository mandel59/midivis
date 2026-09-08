import { EventEmitter } from "events"

/**
 * @typedef {object} MidiInputPort
 * @property {string} id
 * @property {string | null} name
 * @property {string} state
 * @property {() => Promise<unknown>} open
 * @property {() => Promise<unknown>} close
 * @property {(type: string, listener: (event: any) => void) => void} addEventListener
 * @property {(type: string, listener: (event: any) => void) => void} removeEventListener
 *
 * @typedef {object} MidiAccessSource
 * @property {Pick<Map<string, MidiInputPort>, "values">} inputs
 * @property {(type: string, listener: () => void) => void} addEventListener
 * @property {(type: string, listener: () => void) => void} removeEventListener
 */

/** @returns {Promise<MidiAccessSource>} */
async function requestMIDIAccess() {
    if (!("requestMIDIAccess" in navigator)) {
        throw new Error("Web MIDI API is not available. See https://caniuse.com/midi for browsers supporting Web MIDI.")
    }
    const request = /** @type {(options: object) => Promise<MidiAccessSource>} */ (navigator.requestMIDIAccess)
    return request.call(navigator, { sysex: false, software: false })
}

export class MidiInputPortSelector extends EventEmitter {
    /** @param {{requestAccess?: () => Promise<MidiAccessSource>}} [options] */
    constructor({ requestAccess = requestMIDIAccess } = {}) {
        super()
        this._requestAccess = requestAccess
        /** @type {Promise<MidiAccessSource> | undefined} */
        this._accessPromise = undefined
        /** @type {MidiInputPort | undefined} */
        this._input = undefined
        this._queue = Promise.resolve()
        this._emitMessage = (/** @type {{data: Uint8Array, timeStamp: number}} */ event) => {
            // DOMHighResTimeStamp: milliseconds on the performance.now() time origin.
            this.emit("message", event.timeStamp, event.data)
        }
        this._stateChange = () => {
            this._enqueue(async () => {
                if (this._input?.state === "disconnected") await this._disconnect()
            }).finally(() => this.emit("portschange")).catch(error => this.emit("connectionError", error))
        }
    }
    async _access() {
        if (!this._accessPromise) {
            this._accessPromise = this._requestAccess().then(access => {
                access.addEventListener("statechange", this._stateChange)
                return access
            }).catch(error => {
                this._accessPromise = undefined
                throw error
            })
        }
        return this._accessPromise
    }
    /** @template T @param {() => Promise<T>} operation */
    _enqueue(operation) {
        const result = this._queue.then(operation)
        this._queue = result.then(() => {}, () => {})
        return result
    }
    async _disconnect() {
        const input = this._input
        if (!input) return
        this._input = undefined
        input.removeEventListener("midimessage", this._emitMessage)
        this.emit("disconnect")
        await input.close()
    }
    /** Accept an ID, or a legacy saved name. @param {string} name */
    openPortByName(name) {
        return this._enqueue(async () => {
            const access = await this._access()
            const ports = [...access.inputs.values()].filter(port => port.state !== "disconnected")
            const input = ports.find(port => port.id === name) ?? ports.find(port => port.name === name)
            if (!input) return false
            if (input === this._input) return true
            await this._disconnect()
            await input.open()
            if (input.state === "disconnected") {
                await input.close()
                return false
            }
            this._input = input
            input.addEventListener("midimessage", this._emitMessage)
            return true
        }).finally(() => {
            // A rejected permission request must be retried only by the user.
            if (this._accessPromise) this.emit("portschange")
        })
    }
    closePort() {
        return this._enqueue(() => this._disconnect()).finally(() => this.emit("portschange"))
    }
    async portOptions() {
        const access = await this._access()
        return [...access.inputs.values()]
            .filter(port => port.state !== "disconnected")
            .map(port => ({ id: port.id, name: port.name || port.id, selected: port === this._input }))
    }
    async dispose() {
        await this.closePort()
        const access = await this._accessPromise
        access?.removeEventListener("statechange", this._stateChange)
        this._accessPromise = undefined
        this.removeAllListeners()
    }
}
