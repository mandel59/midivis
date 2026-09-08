import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLayout, layoutCells, noteArrangements, arrangementGroups } from '../../src/note-arrangement.js'
import { cellNoteName, inScale, isTonicNote, noteColor, isSharpKey } from '../../src/note-style.js'

for (const { id } of noteArrangements) test(`${id} exposes finite, distinct lattice cells without DOM`, () => {
    const cells = layoutCells(id)
    assert.equal(new Set(cells.map(c => `${c.x},${c.y}`)).size, cells.length)
    assert.ok(cells.every(c => Number.isInteger(c.note)))
    assert.ok(cells.some(c => c.visible))
    assert.equal(cells[0].row, 0)
})
test('square grid pitch steps and guitar tuning are explicit', () => {
    const cells = layoutCells('fourth')
    const at = (x, y) => cells.find(c => c.x === x && c.y === y).note
    assert.equal(at(0, 0), 0)
    assert.equal(at(1, 0) - at(0, 0), 1)
    assert.equal(at(0, 1) - at(0, 0), 5)
    const guitar = layoutCells('guitar')
    assert.deepEqual(guitar.filter(c => c.x === 0).map(c => c.note).reverse(), [40, 45, 50, 55, 59, 64])
})
test('hexagonal layouts retain repeated pitches and slanted visibility', () => {
    const cells = layoutCells('tonnetz')
    assert.ok(cells.filter(c => c.note === 60).length > 1)
    assert.ok(cells.some(c => c.x < 0))
    assert.ok(cells.some(c => c.paddingBefore))
    assert.ok(layoutCells('janko-slanted').some(c => !c.visible))
    assert.throws(() => getLayout('missing'), /unknown note arrangement/)
})
test('note spelling, scale membership and color mapping are pure', () => {
    const options = { sharp: false, arrangement: 'fourth', x: 0, y: 0, base: 0 }
    assert.equal(cellNoteName(61, options), 'D<sup>♭</sup><sub>4</sub>')
    assert.equal(cellNoteName(61, { ...options, sharp: true }), 'C<sup>♯</sup><sub>4</sub>')
    assert.equal(inScale(0, 2741, 60), true)
    assert.equal(inScale(0, 2741, 61), false)
    assert.equal(isTonicNote(0, 72), true)
    assert.equal(noteColor(1, 'fifth', '1'), 'hsla(210deg, 70%, 75%, 1)')
    assert.equal(noteColor(1, 'chromatic', '0.5'), 'hsla(30deg, 70%, 75%, 0.5)')
    assert.equal(isSharpKey(7, 2741), true)
    assert.equal(isSharpKey(5, 2741), false)
})

test('settings families expose every saved layout exactly once', () => {
    const families = arrangementGroups.flatMap(group => group.families)
    const variants = families.flatMap(family => family.variants)
    assert.deepEqual([...variants].sort(), noteArrangements.map(layout => layout.id).sort())
    assert.ok(families.every(family => family.variants[0] === family.id))
})

for (const id of ['piano', 'piano-vertical']) test(`${id} has 88 correctly spaced piano keys`, () => {
    const cells = layoutCells(id)
    assert.deepEqual(cells.map(cell => cell.note).sort((a, b) => a - b), Array.from({ length: 88 }, (_, i) => i + 21))
    assert.equal(cells.filter(cell => cell.piano.black).length, 36)
    const at = note => cells.find(cell => cell.note === note).piano
    assert.equal(at(61).black, true)
    assert.equal(at(64).black, false)
    assert.equal(at(65).left - at(64).left, 40)
    assert.ok(at(61).left > at(60).left)
    assert.ok(at(61).left < at(62).left)
    assert.ok(at(61).height < at(60).height)
    if (id === 'piano') {
        assert.equal(at(72).left - at(60).left, 280)
        assert.equal(at(72).top, at(60).top)
    } else {
        assert.equal(at(72).left, at(60).left)
        assert.equal(at(60).top - at(72).top, 112)
    }
})

test('perfect fourth–whole tone grid has the specified intervals on both axes', () => {
    const cells = layoutCells('fourth-whole-tone')
    const at = (x, y) => cells.find(cell => cell.x === x && cell.y === y).note
    assert.equal(at(0, 0), 0)
    for (const cell of cells) {
        if (cell.x < 11) assert.equal(at(cell.x + 1, cell.y) - cell.note, 2)
        if (cell.y < 22) assert.equal(at(cell.x, cell.y + 1) - cell.note, 5)
    }
})
