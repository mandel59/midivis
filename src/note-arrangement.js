/**
 * @typedef {object} LayoutDefinition
 * @property {NoteArrangement} id
 * @property {string} label
 * @property {'square' | 'hexagonal' | 'piano'} grid
 * @property {number} columns
 * @property {number} rows
 * @property {number} stepX
 * @property {number | number[]} stepY
 * @property {number} base
 */
export const cellWidth = 40
export const cellHeight = 32

/** @type {LayoutDefinition[]} */
export const noteArrangements = [
    { id: "piano", label: "Piano", grid: "piano", columns: 52, rows: 1, stepX: 1, stepY: 12, base: 21 },
    { id: "piano-vertical", label: "Piano (Vertical octaves)", grid: "piano", columns: 7, rows: 9, stepX: 1, stepY: 12, base: 21 },
    { id: "third", label: "Third", grid: "hexagonal", columns: 12, rows: 23, stepX: 1, stepY: 4, base: 21 },
    { id: "fourth", label: "Fourth", grid: "square", columns: 12, rows: 23, stepX: 1, stepY: 5, base: 0 },
    { id: "tritone", label: "Tritone", grid: "square", columns: 14, rows: 22, stepX: 1, stepY: 6, base: -3 },
    { id: "fifth", label: "Fifth", grid: "square", columns: 12, rows: 23, stepX: 1, stepY: 7, base: 0 },
    { id: "octave", label: "Octave", grid: "square", columns: 16, rows: 11, stepX: 1, stepY: 12, base: -3 },
    { id: "wicki-hayden", label: "Wicki–Hayden", grid: "hexagonal", columns: 10, rows: 22, stepX: 2, stepY: 7, base: -6 },
    { id: "wicki-hayden-wide", label: "Wicki–Hayden (Wide)", grid: "hexagonal", columns: 18, rows: 22, stepX: 2, stepY: 7, base: -14 },
    { id: "tonnetz", label: "Tonnetz", grid: "hexagonal", columns: 20, rows: 15, stepX: 7, stepY: 3, base: 0 },
    { id: "janko", label: "Jankó", grid: "hexagonal", columns: 43, rows: 6, stepX: 2, stepY: 1, base: 22 },
    { id: "janko-tall", label: "Jankó (Tall)", grid: "hexagonal", columns: 43, rows: 9, stepX: 2, stepY: 1, base: 22 },
    { id: "janko-slanted", label: "Jankó (Slanted)", grid: "hexagonal", columns: 43, rows: 24, stepX: 2, stepY: 1, base: 22 },
    { id: "c-system", label: "C-system", grid: "hexagonal", columns: 33, rows: 5, stepX: 3, stepY: 1, base: 18 },
    { id: "b-system", label: "B-system", grid: "hexagonal", columns: 33, rows: 5, stepX: 3, stepY: 2, base: 17 },
    { id: "guitar", label: "Guitar", grid: "square", columns: 25, rows: 6, stepX: 1, stepY: [0, 5, 10, 15, 19, 24], base: 40 },
    { id: "bass", label: "Bass Guitar", grid: "square", columns: 25, rows: 4, stepX: 1, stepY: 5, base: 28 },
]

/** @param {NoteArrangement} id */
export function getLayout(id) {
    const layout = noteArrangements.find(layout => layout.id === id)
    if (!layout) throw new Error("unknown note arrangement")
    return layout
}

/**
 * DOM-independent cells in display order. x/y are musical lattice coordinates;
 * column/row address the displayed grid. Repeated pitches remain separate cells.
 * @param {NoteArrangement} id
 */
export function layoutCells(id) {
    const layout = getLayout(id)
    if (layout.grid === 'piano') return pianoCells(id === 'piano-vertical')
    const cells = []
    for (let y = layout.rows - 1; y >= 0; y--) {
        const padded = layout.grid === 'hexagonal' && y % 2 === 0
        const columns = layout.columns - (padded ? 1 : 0)
        for (let column = 0; column < columns; column++) {
            const x = layout.grid === 'hexagonal' ? column - ((y + 1) >> 1) : column
            const yOffset = typeof layout.stepY === 'number' ? y * layout.stepY : layout.stepY[y]
            const note = x * layout.stepX + yOffset + layout.base
            const xx = x + y / 2
            const visible = id !== 'janko-slanted' || !((y - 24) / 2 >= -xx / 6 || y / 2 <= -(xx - 43) / 6)
            cells.push({ x, y, column, row: layout.rows - 1 - y, note, visible,
                paddingBefore: padded && column === 0,
                paddingAfter: padded && column === columns - 1 })
        }
    }
    return cells
}

/** Settings families group existing layouts without changing their geometry or saved IDs.
 * @type {{id: 'interval' | 'harmony' | 'keyboard' | 'strings', families: {id: NoteArrangement, variants: NoteArrangement[]}[]}[]}
 */
export const arrangementGroups = [
    { id: 'interval', families: [
        { id: 'third', variants: ['third'] },
        { id: 'fourth', variants: ['fourth'] },
        { id: 'tritone', variants: ['tritone'] },
        { id: 'fifth', variants: ['fifth'] },
        { id: 'octave', variants: ['octave'] },
    ] },
    { id: 'harmony', families: [{ id: 'tonnetz', variants: ['tonnetz'] }] },
    { id: 'keyboard', families: [
        { id: 'piano', variants: ['piano', 'piano-vertical'] },
        { id: 'wicki-hayden', variants: ['wicki-hayden', 'wicki-hayden-wide'] },
        { id: 'janko', variants: ['janko', 'janko-tall', 'janko-slanted'] },
        { id: 'c-system', variants: ['c-system'] },
        { id: 'b-system', variants: ['b-system'] },
    ] },
    { id: 'strings', families: [
        { id: 'guitar', variants: ['guitar'] },
        { id: 'bass', variants: ['bass'] },
    ] },
]

/** Pixel geometry for an 88-key piano (A0–C8). Vertical rows ascend by octave.
 * @param {boolean} vertical
 */
export function pianoCells(vertical) {
    const positions = [0, 0.7, 1, 1.7, 2, 3, 3.7, 4, 4.7, 5, 5.7, 6]
    const cells = []
    for (let note = 21; note <= 108; note++) {
        const pitch = note % 12
        const octave = Math.floor(note / 12) - 1
        const black = [1, 3, 6, 8, 10].includes(pitch)
        const x = positions[pitch] + (vertical ? 0 : octave * 7 - 5)
        const row = vertical ? 8 - octave : 0
        cells.push({ note, x, y: row, column: x, row, visible: true,
            paddingBefore: false, paddingAfter: false,
            piano: { left: x * cellWidth, top: row * 112, width: cellWidth * (black ? 0.6 : 1), height: black ? 60 : 96, black },
        })
    }
    return cells.sort((a, b) => a.row - b.row || a.note - b.note)
}
