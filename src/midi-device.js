import { parseMidiMessage } from './midi-message.js'

const PERCUSSION_CHANNEL = 10
/** @param {number[]} notes */
const uniqueSorted = notes => [...new Set(notes)].sort((a, b) => a - b)

/** The single performance state; maps are keyed by original MIDI note number. */
export class MidiDevice {
    /** @param {number} [channel] @param {{now?: () => number}} [options] */
    constructor(channel, { now = () => performance.now() } = {}) {
        this.channel = channel
        this.now = now
        /** @type {Map<number, number>[]} */
        this.noteVelocityMaps = Array.from({ length: 16 }, () => new Map())
        /** @type {Map<number, number>[]} */
        this.noteOnTimingMaps = Array.from({ length: 16 }, () => new Map())
        this.programs = Array(16).fill(0)
        /** @type {number[]} */
        this.noteOffsets = Array(16).fill(0)
        /** @type {Set<(kind: string) => void>} */
        this.listeners = new Set()
    }
    /** @param {(kind: string) => void} listener */
    subscribe(listener) {
        this.listeners.add(listener)
        return () => { this.listeners.delete(listener) }
    }
    /** @param {string} kind */
    notify(kind) {
        for (const listener of this.listeners) listener(kind)
    }
    notes() {
        return uniqueSorted(this.noteVelocityMaps.flatMap((map, i) =>
            i + 1 === PERCUSSION_CHANNEL ? [] : [...map.keys()].map(note => this.offsetNote(note, i + 1))))
    }
    /** Includes held notes plus notes whose note-on was at most t ms ago. @param {number} t */
    reverbNotes(t) {
        const now = this.now()
        return uniqueSorted([
            ...this.notes(),
            ...this.noteOnTimingMaps.flatMap((map, i) => i + 1 === PERCUSSION_CHANNEL ? [] :
                [...map].filter(([, timestamp]) => timestamp + t >= now).map(([note]) => this.offsetNote(note, i + 1))),
        ])
    }
    /** @param {number} note */
    velocities(note) {
        return this.noteVelocityMaps.flatMap((map, i) => i + 1 === PERCUSSION_CHANNEL ? [] :
            [map.get(note - this.noteOffsets[i]) ?? 0])
    }
    /** @param {number} note @param {number} velocity @param {number} channel @param {number} [timestamp] */
    noteOn(note, velocity, channel, timestamp = this.now()) {
        this.noteVelocityMaps[channel - 1].set(note, velocity)
        this.noteOnTimingMaps[channel - 1].set(note, timestamp)
        this.notify('noteOn')
    }
    /** @param {number} note @param {number} velocity @param {number} channel */
    noteOff(note, velocity, channel) {
        this.noteVelocityMaps[channel - 1].delete(note)
        this.notify('noteOff')
    }
    /** Preserve the existing channel-mode release policy. @param {number} channel */
    allSoundOff(channel) { this.allNoteOff(channel) }
    /** @param {number} channel */
    allNoteOff(channel) {
        this.noteVelocityMaps[channel - 1].clear()
        this.notify('noteOff')
    }
    /** @param {number} channel */
    resetAll(channel) { this.allNoteOff(channel) }
    /** Used on input disconnection; old notes must not leak into the next input. */
    clear() {
        for (const map of [...this.noteVelocityMaps, ...this.noteOnTimingMaps]) map.clear()
        this.programs.fill(0)
        this.notify('clear')
    }
    /** @param {number} program @param {number} channel */
    programChange(program, channel) {
        this.programs[channel - 1] = program
        this.notify('programChange')
    }
    /** @param {number} offset @param {number} channel */
    setNoteOffset(offset, channel) {
        if (this.noteOffsets[channel - 1] === offset) return
        this.noteOffsets[channel - 1] = offset
        this.notify('offset')
    }
    /** @param {number} note @param {number} channel */
    offsetNote(note, channel) { return note + this.noteOffsets[channel - 1] }
    /** @param {import('./midi-message.js').MidiMessage} event */
    applyEvent(event) {
        if (this.channel && this.channel !== event.channel) return
        switch (event.kind) {
            case 'noteOn': this.noteOn(event.note, event.velocity, event.channel, event.timestamp); break
            case 'noteOff': this.noteOff(event.note, event.velocity, event.channel); break
            case 'programChange': this.programChange(event.program, event.channel); break
            case 'controlChange':
                if (event.controller === 120) this.allSoundOff(event.channel)
                else if (event.controller === 121) this.resetAll(event.channel)
                else if (event.controller === 123) this.allNoteOff(event.channel)
                break
        }
    }
    /** @param {number | undefined} timestamp @param {ArrayLike<number>} message */
    midiMessageHandler(timestamp, message) {
        const event = parseMidiMessage(message, timestamp ?? this.now())
        if (event) this.applyEvent(event)
    }
}
