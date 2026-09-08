import { noteName, chordName } from './chord.js'

export class ChordPrinter {
    /**
     * @param {import('./midi-device.js').MidiDevice} device
     * @param {object} [options]
     * @param {Console} [options.console]
     * @param {(chord: string) => void} [options.onChordChange]
     * @param {boolean} [options.sharp]
     * @param {boolean} [options.useDegree]
     * @param {number} [options.scaleKey]
     */
    constructor(device, {
        console = undefined,
        onChordChange = undefined,
        sharp = false,
        useDegree = false,
        scaleKey = 0,
    } = {}) {
        this.device = device
        this.unsubscribe = device.subscribe(kind => {
            if (kind === "noteOn" || (kind === "offset" && device.notes().length > 0)) this.updateChord()
        })
        this.console = console
        this.onChordChange = onChordChange
        /** @type {string | undefined} */
        this.currentChord = undefined
        /** @type {number[]} */
        this.displayedNotes = []
        this.sharp = sharp
        this.useDegree = useDegree
        this.scaleKey = scaleKey
    }
    /**
     * @param {number[]} notes
     * @returns 
     */
    showNotes(notes) {
        return notes
            .map(note => noteName(note, { sharp: this.sharp }))
            .join(" ")
    }
    /**
     * @param {number[]} notes
     * @returns 
     */
    showChord(notes) {
        return chordName(notes, {
            sharp: this.sharp,
            useDegree: this.useDegree,
            scaleKey: this.scaleKey,
        })
    }
    dispose() { this.unsubscribe() }
    /** @param {{sharp: boolean, useDegree: boolean, scaleKey: number}} options */
    updateOptions({ sharp, useDegree, scaleKey }) {
        if (this.sharp === sharp && this.useDegree === useDegree && this.scaleKey === scaleKey) return
        this.sharp = sharp
        this.useDegree = useDegree
        this.scaleKey = scaleKey
        this.publishChord(this.displayedNotes)
    }
    updateChord() {
        this.publishChord(this.device.reverbNotes(200))
    }
    /** @param {number[]} noteNumbers */
    publishChord(noteNumbers) {
        this.displayedNotes = [...noteNumbers]
        const notes = this.showNotes(noteNumbers)
        const chord = this.showChord(noteNumbers)
        if (this.console && typeof this.console.log === "function") {
            this.console.log(`${notes} = ${chord}`)
        } else if (this.console === undefined) {
            console.log(`${notes} = ${chord}`)
        }
        if (this.currentChord !== chord) {
            if (typeof this.onChordChange === "function") {
                this.onChordChange(chord)
            }
        }
        this.currentChord = chord
    }
}
