const { noteName, chordName } = require('./chord')
const { MidiDevice } = require('./midi-device')

/**
 * @param {number} column
 * @param {number} row
 * @param {HTMLElement} element 
 * @param {(x: number, y: number) => HTMLElement} callback 
 */
function tileSquare(column, row, element, callback) {
    element.innerHTML = ""
    element.style.userSelect = "none"
    element.style.display = "grid"
    element.style.gridTemplateColumns = `repeat(${column * 2}, 1fr)`
    for (let y = row; y >= 0; y--) {
        for (let x = 0; x < column; x++) {
            const div = callback(x, y)
            element.appendChild(div)
        }
    }
}

/**
 * @param {number} column
 * @param {number} row
 * @param {HTMLElement} element 
 * @param {(x: number, y: number) => HTMLElement} callback 
 */
function tileHexagonal(column, row, element, callback) {
    element.innerHTML = ""
    element.style.userSelect = "none"
    element.style.display = "grid"
    element.style.gridTemplateColumns = `repeat(${column * 2}, 1fr)`
    function insertPadding() {
        const div = document.createElement("div")
        div.innerHTML = "&nbsp;"
        div.style.gridColumnEnd = "span 1"
        element.appendChild(div)
    }
    for (let y = row; y >= 0; y--) {
        const even = y % 2 === 0
        if (even) insertPadding()
        for (let x = 0; x < (even ? column - 1 : column); x++) {
            const div = callback(x - ((y + 1) >> 1), y)
            element.appendChild(div)
        }
        if (even) insertPadding()
    }
}

class ChordVisualizer extends MidiDevice {
    /**
     * 
     * @param {HTMLElement} element 
     * @param {ChordVisualizerOptions} options
     * @typedef ChordVisualizerOptions
     * @property {boolean} [sharp]
     * @property {"monotone" | "chromatic" | "axis" | "quintave"} [colorScheme]
     * @property {"fourth" | "c-system"} [noteArrangement]
     */
    constructor(element, { sharp = false, colorScheme = "monotone", noteArrangement = "c-system" } = {}) {
        super()
        this.element = element
        this._sharp = sharp
        this._colorScheme = colorScheme
        this._noteArrangement = noteArrangement
        this.prepareDOM()
    }
    /**
     * @param {ChordVisualizerOptions} param1
     */
    updateOptions({ sharp, colorScheme, noteArrangement }) {
        if (sharp != null) this._sharp = sharp
        if (colorScheme != null) this._colorScheme = colorScheme
        if (noteArrangement != null) this._noteArrangement = noteArrangement
        this.prepareDOM()
    }
    get sharp() {
        return this._sharp
    }
    get colorScheme() {
        return this._colorScheme
    }
    prepareDOM() {
        const keyNames = this._sharp
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
        const noteElement = (stepX, stepY) => (x, y) => {
            const note = y * stepY + x * stepX
            const keyName = keyNames[(note + 1200) % 12]
            const octave = ((note / 12) | 0) - 1
            const div = document.createElement("div")
            div.className = `note`
            div.innerHTML = `${keyName}<sub>${octave}</sub>`
            div.style.textAlign = `center`
            div.style.gridColumnEnd = "span 2"
            const maxVelocity = `var(--v-max-${note}, 0)`
            div.style.color = `hsla(0, 0%, 0%, calc(${maxVelocity} * 0.8 + 0.2))`
            if (this._colorScheme === "chromatic") {
                div.style.backgroundColor = `hsla(${note * (360 / 12)}deg, 70%, 75%, ${maxVelocity})`
            } else if (this._colorScheme === "fifth") {
                div.style.backgroundColor = `hsla(${note * (360 / 12 * 7)}deg, 70%, 75%, ${maxVelocity})`
            } else if (this._colorScheme === "axis") {
                div.style.backgroundColor = `hsla(${note * (360 / 3) + 240}deg, 70%, 75%, ${maxVelocity})`
            } else if (this._colorScheme === "quintave") {
                div.style.backgroundColor = `hsla(${note * (360 / 7)}deg, 70%, 75%, ${maxVelocity})`
            } else {
                div.style.backgroundColor = `hsla(240deg, 100%, 75%, ${maxVelocity})`
            }
            div.style.transitionTimingFunction = `cubic-bezier(0, 1, 0.5, 1)`
            div.style.transitionDuration = `calc((1 - ${maxVelocity}) * 1s)`
            return div
        }
        if (this._noteArrangement === "c-system") {
            tileHexagonal(32, 5, this.element, noteElement(3, 1))
        } else {
            tileSquare(12, 22, this.element, noteElement(1, 5))
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
