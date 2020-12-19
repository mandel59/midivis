const { noteName, chordName } = require('./chord')
const { MidiDevice } = require('./midi-device')

class ChordVisualizer extends MidiDevice {
    #sharp
    /**
     * 
     * @param {HTMLElement} element 
     */
    constructor(element, { sharp = false } = {}) {
        super()
        this.element = element
        this.#sharp = sharp
        this.prepareDOM()
    }
    get sharp() {
        return this.#sharp
    }
    set sharp(value) {
        this.#sharp = value
        this.prepareDOM()
    }
    prepareDOM() {
        this.element.innerHTML = ""
        this.element.style.userSelect = "none"
        this.element.style.display = "grid"
        this.element.style.gridTemplateColumns = "repeat(12, 1fr)"
        const keyNames = this.#sharp
            ? [
                "C",
                "C<sup>♯</sup>",
                "D",
                "D<sup>♯</sup>",
                "E",
                "F",
                "F<sup>♯</sup>",
                "G",
                "G<sup>♯</sup>",
                "A",
                "A<sup>♯</sup>",
                "B",
            ]
            : [
                "C",
                "D<sup>♭</sup>",
                "D",
                "E<sup>♭</sup>",
                "E",
                "F",
                "G<sup>♭</sup>",
                "G",
                "A<sup>♭</sup>",
                "A",
                "B<sup>♭</sup>",
                "B",
            ]
        for (let i = 22; i >= 0; i--) {
            const baseNote = i * 5
            for (let note = baseNote; note < baseNote + 12; note++) {
                const keyName = keyNames[note % 12]
                const octave = ((note / 12) | 0) - 1
                const div = document.createElement("div")
                div.className = `note`
                div.innerHTML = `${keyName}<sub>${octave}</sub>`
                div.style.textAlign = `center`
                const maxVelocity = `var(--v-max-${note}, 0)`
                div.style.color = `rgba(0, 0, 0, calc(${maxVelocity} * 0.8 + 0.2))`
                div.style.backgroundColor = `rgba(128, 128, 255, ${maxVelocity})`
                div.style.transitionTimingFunction = `cubic-bezier(0, 1, 0.5, 1)`
                div.style.transitionDuration = `calc((1 - ${maxVelocity}) * 1s)`
                this.element.appendChild(div)
            }
        }
    }
    setVariable(note, velocity, channel) {
        // this.element.style.setProperty(`--v-${channel}-${note}`, String(velocity / 127))
        const vs = this.velocities(note)
        const vMax = String(Math.max(0, ...vs) / 127)
        this.element.style.setProperty(`--v-max-${note}`, vMax > 0 ? 1 : 0)
    }
    noteOn(note, velocity, channel) {
        super.noteOn(note, velocity, channel)
        this.setVariable(note, velocity, channel)
    }
    noteOff(note, velocity, channel) {
        super.noteOff(note, velocity, channel)
        this.setVariable(note, 0, channel)
    }
}

module.exports = { ChordVisualizer }
