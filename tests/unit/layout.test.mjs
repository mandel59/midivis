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
