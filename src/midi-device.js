function compareNumber(a, b) {
    return a - b
}

/**
 * @template T
 * @param {T[]} values 
 */
function unique(values) {
    return [...new Set(values)]
}

const PERCUSSION_CHANNEL = 10

class MidiDevice {
    /**
     * 
     * @param {number} [channel]
     */
    constructor(channel) {
        /** @type {Map<number, number>[]} */
        this.noteVelocityMaps = []
        /** @type {number[]} */
        this.programs = []
        /** @type {number[]} */
        this.noteOffsets = []
        for (let i = 0; i < 16; i++) {
            this.noteVelocityMaps.push(new Map())
            this.programs.push(0)
            this.noteOffsets.push(0)
        }
        this.channel = channel
    }
    notes() {
        /** @type {number[]} */
        const mergedNotes = [...this.noteVelocityMaps.map((m, i) => i + 1 === PERCUSSION_CHANNEL ? [] : [...m.keys()])].flat()
        return unique(mergedNotes)
            .sort(compareNumber)
    }
    velocities(note) {
        /** @type {number[]} */
        const vs = []
        for (let i = 0; i < 16; i++) {
            if (i + 1 === PERCUSSION_CHANNEL) continue
            const v = this.noteVelocityMaps[i].get(note) || 0
            vs.push(v)
        }
        return vs
    }
    /**
     * @param {number} note 
     * @param {number} velocity 
     * @param {number} channel 
     */
    noteOn(note, velocity, channel) {
        this.noteVelocityMaps[channel - 1].set(note, velocity)
    }
    /**
     * @param {number} note 
     * @param {number} velocity 
     * @param {number} channel 
     */
    noteOff(note, velocity, channel) {
        this.noteVelocityMaps[channel - 1].delete(note)
    }
    /**
     * @param {number} channel 
     */
    allSoundOff(channel) {
        const notes = this.notes()
        for (const note of notes) {
            this.noteOff(note, 0, channel)
        }
    }
    /**
     * @param {number} channel 
     */
    allNoteOff(channel) {
        const notes = this.notes()
        for (const note of notes) {
            this.noteOff(note, 0, channel)
        }
    }
    /**
     * @param {number} channel 
     */
    resetAll(channel) {

    }
    /**
     * @param {number} program
     * @param {number} channel 
     */
    programChange(program, channel) {
        this.programs[channel - 1] = program
    }
    unknownMessage(message) {
        // console.log(message.map(x => x.toString(16)))
    }
    setNoteOffset(offset, channel) {
        this.noteOffsets[channel - 1] = offset
    }
    offsetNote(note, channel) {
        return note + this.noteOffsets[channel - 1]
    }
    midiMessageHandler(deltaTime, message) {
        const [m1, m2, m3] = message
        const channel = (m1 & 0x0F) + 1
        if (this.channel && this.channel !== channel) {
            return
        }
        const messageType = m1 & 0xF0
        switch (messageType) {
            case 0x80: {
                this.noteOff(this.offsetNote(m2, channel), m3, channel)
                break
            }
            case 0x90: {
                if (m3 === 0) {
                    this.noteOff(this.offsetNote(m2, channel), m3, channel)
                } else {
                    this.noteOn(this.offsetNote(m2, channel), m3, channel)
                }
                break
            }
            case 0xB0: {
                if (m2 === 120) {
                    this.allSoundOff(channel)
                } else if (m2 === 121) {
                    this.resetAll(channel)
                } else if (m2 === 123) {
                    this.allNoteOff(channel)
                }
                break
            }
            case 0xC0: {
                this.programChange(m2, channel)
                break
            }
            default: {
                this.unknownMessage(message)
            }
        }
    }
}

module.exports = { MidiDevice }
