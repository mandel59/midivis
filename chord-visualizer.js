const { noteName, chordName } = require('./chord')
const { MidiDevice } = require('./midi-device')

class ChordVisualizer extends MidiDevice {
    #sharp
    #colorScheme
    /**
     * 
     * @param {HTMLElement} element 
     * @param {ChordVisualizerOptions} options
     * @typedef ChordVisualizerOptions
     * @property {boolean} [sharp]
     * @property {"monotone" | "chromatic" | "axis" | "quintave"} [colorScheme]
     */
    constructor(element, { sharp = false, colorScheme = "monotone" } = {}) {
        super()
        this.element = element
        this.#sharp = sharp
        this.#colorScheme = colorScheme
        this.prepareDOM()
    }
    /**
     * @param {ChordVisualizerOptions} param1
     */
    updateOptions({ sharp, colorScheme }) {
        if (sharp != null) this.#sharp = sharp
        if (colorScheme != null) this.#colorScheme = colorScheme
        this.prepareDOM()
    }
    get sharp() {
        return this.#sharp
    }
    get colorScheme() {
        return this.#colorScheme
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
                div.style.color = `hsla(0, 0%, 0%, calc(${maxVelocity} * 0.8 + 0.2))`
                if (this.#colorScheme === "chromatic") {
                    div.style.backgroundColor = `hsla(${note * (360 / 12)}deg, 70%, 75%, ${maxVelocity})`
                } else if (this.#colorScheme === "fifth") {
                    div.style.backgroundColor = `hsla(${note * (360 / 12 * 7)}deg, 70%, 75%, ${maxVelocity})`
                } else if (this.#colorScheme === "axis") {
                    div.style.backgroundColor = `hsla(${note * (360 / 3) + 240}deg, 70%, 75%, ${maxVelocity})`
                } else if (this.#colorScheme === "quintave") {
                    div.style.backgroundColor = `hsla(${note * (360 / 7)}deg, 70%, 75%, ${maxVelocity})`
                } else {
                    div.style.backgroundColor = `hsla(240deg, 100%, 75%, ${maxVelocity})`
                }
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
