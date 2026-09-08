/**
 * @typedef {{kind: 'noteOn' | 'noteOff', channel: number, note: number, velocity: number, timestamp: number}
 * | {kind: 'controlChange', channel: number, controller: number, value: number, timestamp: number}
 * | {kind: 'programChange', channel: number, program: number, timestamp: number}
 * | {kind: 'unknown', channel: number, data: number[], timestamp: number}} MidiMessage
 */

/**
 * Decode one Web MIDI message. Channels are 1–16; timestamps are milliseconds
 * on the performance.now() origin, not deltas. Unsupported messages are retained
 * for diagnostics; incomplete/invalid supported messages are ignored.
 * @param {ArrayLike<number>} data
 * @param {number} timestamp
 * @returns {MidiMessage | null}
 */
export function parseMidiMessage(data, timestamp) {
    const status = data[0]
    if (!Number.isInteger(status) || status < 0x80 || status > 0xFF || !Number.isFinite(timestamp)) return null
    const channel = (status & 0x0F) + 1
    const type = status & 0xF0
    if (![0x80, 0x90, 0xB0, 0xC0].includes(type)) {
        return { kind: 'unknown', channel, data: Array.from(data), timestamp }
    }
    const length = type === 0xC0 ? 2 : 3
    if (data.length < length) return null
    for (let i = 1; i < length; i++) {
        if (!Number.isInteger(data[i]) || data[i] < 0 || data[i] > 127) return null
    }
    if (type === 0xC0) return { kind: 'programChange', channel, program: data[1], timestamp }
    if (type === 0xB0) return { kind: 'controlChange', channel, controller: data[1], value: data[2], timestamp }
    return { kind: type === 0x80 || data[2] === 0 ? 'noteOff' : 'noteOn', channel, note: data[1], velocity: data[2], timestamp }
}
