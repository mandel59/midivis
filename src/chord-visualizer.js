const { MidiDevice } = require('./midi-device')

const keyNamesWithSharp = [
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

const keyNamesWithFlat = [
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
    element.style.gridTemplateColumns = `repeat(${column}, 1fr)`
    for (let y = row - 1; y >= 0; y--) {
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
    for (let y = row - 1; y >= 0; y--) {
        const even = y % 2 === 0
        if (even) insertPadding()
        for (let x = 0; x < (even ? column - 1 : column); x++) {
            const div = callback(x - ((y + 1) >> 1), y)
            div.style.gridColumnEnd = "span 2"
            element.appendChild(div)
        }
        if (even) insertPadding()
    }
}

/**
 * @param {number} key
 * @param {number} mode
 * @param {number} note
 */
function inScale(key, mode, note) {
    return (mode & (1 << ((note - key + 1200) % 12))) !== 0
}

function isTonicNote(key, note) {
    return (note + 1200) % 12 === key
}

class ChordVisualizer extends MidiDevice {
    /**
     * 
     * @param {HTMLElement} element 
     * @param {ChordVisualizerOptions} options
     * @typedef ChordVisualizerOptions
     * @property {boolean} [sharp]
     * @property {"monotone" | "chromatic" | "axis" | "quintave" | "third-major"} [colorScheme]
     * @property {"fourth" | "tritone" | "c-system" | "b-system" | "wicki-hayden" | "wicki-hayden-wide" | "tonnetz" | "janko"} [noteArrangement]
     * @property {number} [key]
     * @property {number} [mode]
     */
    constructor(
        element,
        {
            sharp = false,
            colorScheme = "monotone",
            noteArrangement = "fourth",
            key = 0,
            mode = 2741,
        } = {}
    ) {
        super()
        this.element = element
        this._sharp = sharp
        this._colorScheme = colorScheme
        this._noteArrangement = noteArrangement
        this._key = key
        this._mode = mode
        this.prepareDOM()
    }
    /**
     * @param {ChordVisualizerOptions} param1
     */
    updateOptions({
        sharp,
        colorScheme,
        noteArrangement,
        key,
        mode,
    }) {
        if (sharp != null) this._sharp = sharp
        if (colorScheme != null) this._colorScheme = colorScheme
        if (noteArrangement != null) this._noteArrangement = noteArrangement
        if (key != null) this._key = key
        if (mode != null) this._mode = mode
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
            ? keyNamesWithSharp
            : keyNamesWithFlat
        const isWickiHayden
            = this._noteArrangement === "wicki-hayden"
            || this._noteArrangement === "wicki-hayden-wide"
        const isWide = this._noteArrangement === "wicki-hayden-wide"
        /** @type {(note: number, x: number, y: number) => string} */
        const getKeyName
            = isWickiHayden
                ? (_note, x, y, base) => {
                    let k = 2 * x + y + ((7 * base) % 12)
                    if (isWide) k -= 12
                    const n = "CGDAEBF"[(700 + k) % 7]
                    const acc = Math.floor((k + 1) / 7)
                    let s
                    if (acc < -2) s = `<sup>${-acc}♭</sup>`
                    else if (acc > 2) s = `<sup>${acc}♯</sup>`
                    else if (acc === -2) s = "<sup>𝄫</sup>"
                    else if (acc === -1) s = "<sup>♭</sup>"
                    else if (acc === 1) s = "<sup>♯</sup>"
                    else if (acc === 2) s = "<sup>𝄪</sup>"
                    else s = ""
                    return `${n}${s}`
                }
                : (note) => keyNames[(note + 1200) % 12]
        const noteElement = (stepX, stepY, base = 0) => (x, y) => {
            const note = y * stepY + x * stepX + base
            const keyName = getKeyName(note, x, y, base)
            const octave = ((note / 12) | 0) - 1
            const inscale = inScale(this._key, this._mode, note)
            const istonic = isTonicNote(this._key, note)
            const noteBgDiv = document.createElement("div")
            noteBgDiv.className = `note-bg`
            noteBgDiv.style.width = "2.5rem"
            noteBgDiv.style.height = "2rem"
            if (inscale) {
                noteBgDiv.style.background = `hsl(0deg, 0%, 100%)`
            } else {
                noteBgDiv.style.background = `hsl(0deg, 0%, 80%)`
            }
            const div = document.createElement("div")
            noteBgDiv.appendChild(div)
            div.className = `note-fg`
            div.innerHTML = `${keyName}<sub>${octave}</sub>`
            div.style.width = "100%"
            div.style.height = "100%"
            div.style.textAlign = "center"
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
            } else if (this._colorScheme === "third-major") {
                div.style.backgroundColor = `hsla(${note * (360 / 4)}deg, 70%, 75%, ${maxVelocity})`
            } else {
                div.style.backgroundColor = `hsla(240deg, 100%, 75%, ${maxVelocity})`
            }
            div.style.boxSizing = "border-box"
            if (istonic) {
                div.style.border = "solid 4px hsl(0deg, 0%, 90%)"
            } else if (inscale) {
                div.style.border = "solid 4px hsl(0deg, 0%, 100%)"
            } else {
                div.style.border = "solid 4px hsl(0deg, 0%, 80%)"
            }
            div.style.transitionTimingFunction = `cubic-bezier(0, 1, 0.5, 1)`
            div.style.transitionDuration = `calc((1 - ${maxVelocity}) * 1s)`
            return noteBgDiv
        }
        if (this._noteArrangement === "c-system") {
            tileHexagonal(33, 5, this.element, noteElement(3, 1, 18))
        } else if (this._noteArrangement === "b-system") {
            tileHexagonal(33, 5, this.element, noteElement(3, 2, 17))
        } else if (this._noteArrangement === "janko") {
            tileHexagonal(43, 6, this.element, noteElement(2, 1, 22))
        } else if (this._noteArrangement === "wicki-hayden") {
            tileHexagonal(10, 22, this.element, noteElement(2, 7, -6))
        } else if (this._noteArrangement === "wicki-hayden-wide") {
            tileHexagonal(18, 22, this.element, noteElement(2, 7, -14))
        } else if (this._noteArrangement === "fourth") {
            tileSquare(12, 23, this.element, noteElement(1, 5))
        } else if (this._noteArrangement === "tritone") {
            tileSquare(14, 22, this.element, noteElement(1, 6, -3))
        } else if (this._noteArrangement === "tonnetz") {
            tileHexagonal(20, 15, this.element, noteElement(7, 3, 0))
        } else {
            throw new Error("unknown note arrangement")
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
