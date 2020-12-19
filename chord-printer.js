const { noteName, chordName } = require('./chord')
const { MidiDevice } = require('./midi-device')

class ChordPrinter extends MidiDevice {
    constructor(channel, {
        console = undefined,
        onChordChange = undefined,
        sharp = false,
    } = {}) {
        super(channel)
        this.console = console
        this.onChordChange = onChordChange
        this.currentChord = undefined
        this.sharp = sharp
    }
    showNotes() {
        return this.notes()
            .map(note => noteName(note, { sharp: this.sharp }))
            .join(" ")
    }
    showChord() {
        return chordName(this.notes(), { sharp: this.sharp })
    }
    unknownMessage(message) {
        if (this.console && typeof this.console.log === "function") {
            this.console.log(message.map(x => x.toString(16)))
        } else if (this.console === undefined) {
            console.log(message.map(x => x.toString(16)))
        }
    }
    noteOn(note, velocity, channel) {
        super.noteOn(note, velocity, channel)
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
