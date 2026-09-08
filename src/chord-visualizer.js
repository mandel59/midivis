import { cellWidth, cellHeight, getLayout, layoutCells } from './note-arrangement.js'
import { inScale, isTonicNote, cellNoteName, noteColor, channelFill } from './note-style.js'

export class ChordVisualizer {
    /**
     * 
     * @param {HTMLElement} element 
     * @param {import('./midi-device.js').MidiDevice} device
     * @param {ChordVisualizerOptions} options
     * @typedef ChordVisualizerOptions
     * @property {boolean} [ignoreOctave]
     * @property {boolean} [sharp]
     * @property {ColorScheme} [colorScheme]
     * @property {NoteArrangement} [noteArrangement]
     * @property {number} [key]
     * @property {number} [mode]
     */
    constructor(
        element,
        device,
        {
            ignoreOctave = false,
            sharp = false,
            colorScheme = "monotone",
            noteArrangement = "fourth",
            key = 0,
            mode = 2741,
        } = {}
    ) {
        this.device = device
        /** @type {Set<number>} */
        this.litNotes = new Set()
        /** @type {HTMLElement} */
        this.element = element
        /** @type {boolean} */
        this._sharp = sharp
        this._ignoreOctave = ignoreOctave
        /** @type {ColorScheme} */
        this._colorScheme = colorScheme
        /** @type {NoteArrangement} */
        this._noteArrangement = noteArrangement
        /** @type {number} */
        this._key = key
        /** @type {number} */
        this._mode = mode
        this.prepareDOM()
        this.unsubscribe = device.subscribe(() => this.renderNotes())
        this.renderNotes()
    }
    /**
     * @param {ChordVisualizerOptions} param1
     */
    updateOptions({
        ignoreOctave,
        sharp,
        colorScheme,
        noteArrangement,
        key,
        mode,
    }) {
        if ((ignoreOctave == null || ignoreOctave === this._ignoreOctave)
            && (sharp == null || sharp === this._sharp)
            && (colorScheme == null || colorScheme === this._colorScheme)
            && (noteArrangement == null || noteArrangement === this._noteArrangement)
            && (key == null || key === this._key)
            && (mode == null || mode === this._mode)) return
        if (ignoreOctave != null) this._ignoreOctave = ignoreOctave
        if (sharp != null) this._sharp = sharp
        if (colorScheme != null) this._colorScheme = colorScheme
        if (noteArrangement != null) this._noteArrangement = noteArrangement
        if (key != null) this._key = key
        if (mode != null) this._mode = mode
        this.prepareDOM()
        this.renderNotes()
    }
    /** @param {number} note */
    displayPitch(note) { return this._ignoreOctave ? ((note % 12) + 12) % 12 : note }
    get sharp() {
        return this._sharp
    }
    get colorScheme() {
        return this._colorScheme
    }
    prepareDOM() {
        const document = this.element.ownerDocument
        const layout = getLayout(this._noteArrangement)
        const noteElement = (/** @type {ReturnType<typeof layoutCells>[number]} */ cell) => {
            const { note, x, y } = cell
            const noteName = cellNoteName(note, { sharp: this._sharp, arrangement: layout.id, x, y, base: layout.base, ignoreOctave: this._ignoreOctave })
            const inscale = inScale(this._key, this._mode, note)
            const istonic = isTonicNote(this._key, note)
            const noteBgDiv = document.createElement("div")
            noteBgDiv.className = `note-bg`
            noteBgDiv.style.width = `${cellWidth}px`
            noteBgDiv.style.height = `${cellHeight}px`
            if (inscale) {
                noteBgDiv.style.background = `hsl(0deg, 0%, 100%)`
            } else {
                noteBgDiv.style.background = `hsl(0deg, 0%, 80%)`
            }
            const div = document.createElement("div")
            noteBgDiv.appendChild(div)
            div.className = `note-fg`
            div.innerHTML = noteName
            div.style.width = "100%"
            div.style.height = "100%"
            div.style.fontSize = `${Math.min(cellWidth / 2.5, cellHeight / 2)}px`
            div.style.textAlign = "center"
            const maxVelocity = `var(--v-max-${this.displayPitch(note)}, 0)`
            div.style.color = `hsla(0, 0%, 0%, calc(${maxVelocity} * 0.8 + 0.2))`
            if (this._colorScheme === 'channel') {
                div.style.backgroundImage = `var(--channel-fill-${this.displayPitch(note)}, none)`
            } else {
                div.style.backgroundColor = noteColor(this.displayPitch(note), this._colorScheme, maxVelocity)
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
            if ('piano' in cell) {
                const key = cell.piano
                noteBgDiv.classList.add(key.black ? 'piano-black' : 'piano-white')
                noteBgDiv.dataset.note = String(note)
                Object.assign(noteBgDiv.style, {
                    position: 'absolute', left: `${key.left}px`, top: `${key.top}px`,
                    width: `${key.width}px`, height: `${key.height}px`, zIndex: key.black ? '1' : '0',
                    background: key.black ? '#222' : '#fff',
                })
                div.style.display = 'flex'
                div.style.alignItems = 'flex-end'
                div.style.justifyContent = 'center'
                div.style.paddingBottom = '6px'
                div.style.fontSize = key.black ? '11px' : '14px'
                div.style.border = `1px solid ${istonic ? '#7199c5' : '#777'}`
                if (key.black) div.style.color = `hsl(0, 0%, calc((1 - ${maxVelocity}) * 100%))`
            }
            if (!cell.visible) noteBgDiv.style.visibility = "hidden"
            return noteBgDiv
        }
        const keyboard = document.createElement("div")
        const hexagonal = layout.grid === 'hexagonal'
        keyboard.style.userSelect = "none"
        keyboard.style.display = "grid"
        keyboard.style.gridTemplateColumns = `repeat(${layout.columns * (hexagonal ? 2 : 1)}, ${cellWidth / (hexagonal ? 2 : 1)}px)`
        keyboard.style.gridTemplateRows = `repeat(auto-fill, ${cellHeight}px)`
        if (layout.grid === 'piano') {
            keyboard.style.display = 'block'
            keyboard.style.position = 'relative'
            keyboard.style.width = `${layout.columns * cellWidth}px`
            keyboard.style.height = `${layout.rows * 112 - 16}px`
        }
        const insertPadding = () => {
            const padding = document.createElement("div")
            padding.innerHTML = "&nbsp;"
            padding.style.gridColumnEnd = "span 1"
            keyboard.appendChild(padding)
        }
        for (const cell of layoutCells(layout.id)) {
            if (cell.paddingBefore) insertPadding()
            const element = noteElement(cell)
            if (hexagonal) element.style.gridColumnEnd = "span 2"
            keyboard.appendChild(element)
            if (cell.paddingAfter) insertPadding()
        }
        const rotation = this._noteArrangement === "janko-slanted"
            ? Math.atan2(-cellHeight * 2, cellWidth * 6)
            : 0
        if (this._noteArrangement === "janko-slanted") {
            keyboard.style.transformOrigin = `top left`
            keyboard.style.transform = `translateY(${cellHeight * 2}px) rotate(${rotation}rad)`
        }
        this.element.innerHTML = ""
        this.element.style.overflow = "clip"
        if (this._noteArrangement === "janko-slanted") {
            this.element.style.height = `${cellHeight * 12}px`
            // FIXME: this formula is not correct
            this.element.style.width = `${Math.sqrt((cellWidth * 46) ** 2 + (cellHeight * (24 - 46 / 3)) ** 2)}px`
        } else {
            this.element.style.height = `fit-content`
            this.element.style.width = `fit-content`
        }
        this.element.appendChild(keyboard)
    }
    renderNotes() {
        const notes = new Set(this.device.notes().map(note => this.displayPitch(note)))
        for (const note of new Set([...this.litNotes, ...notes])) {
            this.element.style.setProperty(`--v-max-${note}`, notes.has(note) ? "1" : "0")
        }
        if (this._colorScheme === 'channel') {
            /** @type {Map<number, number[]>} */
            const channels = new Map()
            for (const voice of this.device.activeNotes()) {
                const pitch = this.displayPitch(voice.note)
                const active = channels.get(pitch) ?? []
                active.push(voice.channel)
                channels.set(pitch, active)
            }
            for (const note of new Set([...this.litNotes, ...notes])) {
                this.element.style.setProperty(`--channel-fill-${note}`, channelFill(channels.get(note) ?? [], `var(--v-max-${note}, 0)`))
            }
        }
        this.litNotes = notes
    }
    dispose() { this.unsubscribe() }
}
