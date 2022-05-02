const { noteName, chordName } = require('./chord')
const { MidiDevice } = require('./midi-device')

class ChordPrinter extends MidiDevice {
    /**
     * @param {number} [channel]
     * @param {object} [options]
     * @param {Console} [options.console]
     * @param {(chord: string) => void} [options.onChordChange]
     * @param {boolean} [options.sharp]
     * @param {boolean} [options.useDegree]
     * @param {number} [options.scaleKey]
     */
    constructor(channel, {
        console = undefined,
        onChordChange = undefined,
        sharp = false,
        useDegree = false,
        scaleKey = 0,
    } = {}) {
        super(channel)
        this.console = console
        this.onChordChange = onChordChange
        /** @type {string | undefined} */
        this.currentChord = undefined
        this.sharp = sharp
        this.useDegree = useDegree
        this.scaleKey = scaleKey
        this.lastNoteOnAt = 0
    }
    showNotes() {
        return this.notes()
            .map(note => noteName(note, { sharp: this.sharp }))
            .join(" ")
    }
    showChord() {
        return chordName(this.notes(), {
            sharp: this.sharp,
            useDegree: this.useDegree,
            scaleKey: this.scaleKey,
        })
    }
    /**
     * @param {[number, number, number]} message 
     */
    unknownMessage(message) {
        if (this.console && typeof this.console.log === "function") {
            this.console.log(message.map(x => x.toString(16)))
        } else if (this.console === undefined) {
            console.log(message.map(x => x.toString(16)))
        }
    }
    /**
     * @param {number} note 
     * @param {number} velocity 
     * @param {number} channel 
     */
    noteOn(note, velocity, channel) {
        super.noteOn(note, velocity, channel)
        const t = performance.now()
        this.updateChord()
        this.lastNoteOnAt = t
    }
    /**
     * @param {number} note 
     * @param {number} velocity 
     * @param {number} channel 
     */
    noteOff(note, velocity, channel) {
        super.noteOff(note, velocity, channel)
        const t = performance.now()
        if (t - this.lastNoteOnAt < 200) {
            this.updateChord()
        }
    }
    updateChord() {
        const notes = this.showNotes()
        const chord = this.showChord()
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

module.exports = { ChordPrinter }
