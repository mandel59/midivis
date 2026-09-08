import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { ChordVisualizer } from '../../src/chord-visualizer.js'
import { noteArrangements } from '../../src/note-arrangement.js'

const dom = new JSDOM('<div id="vis"></div>')
globalThis.document = dom.window.document
const element = document.getElementById('vis')
const fixtureURL = new URL('../fixtures/layouts.json', import.meta.url)
function describeLayout(id) {
    new ChordVisualizer(element, { noteArrangement: id })
    const cells = [...element.querySelectorAll('.note-bg')].map(cell => ({
        label: cell.textContent,
        style: cell.getAttribute('style'),
        foreground: cell.firstElementChild.getAttribute('style'),
    }))
    return {
        count: cells.length,
        first: cells[0].label,
        last: cells.at(-1).label,
        hash: createHash('sha256').update(JSON.stringify(cells)).digest('hex'),
        container: element.getAttribute('style'),
        grid: element.firstElementChild.getAttribute('style'),
    }
}
if (process.env.RECORD_LAYOUTS) {
    writeFileSync(fixtureURL, JSON.stringify(Object.fromEntries(noteArrangements.map(({ id }) => [id, describeLayout(id)])), null, 2) + '\n')
}
const fixtures = JSON.parse(readFileSync(fixtureURL))
for (const { id } of noteArrangements) test(`${id} preserves cell labels and geometry`, () => {
    assert.deepEqual(describeLayout(id), fixtures[id])
})
test('notes remain lit while another channel holds the same pitch', () => {
    const vis = new ChordVisualizer(element)
    vis.noteOn(60, 50, 1)
    vis.noteOn(60, 100, 2)
    vis.noteOff(60, 0, 1)
    assert.equal(element.style.getPropertyValue('--v-max-60'), '1')
    vis.noteOff(60, 0, 2)
    assert.equal(element.style.getPropertyValue('--v-max-60'), '0')
})
