import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { MidiDevice } from '../../src/midi-device.js'
import { ChordVisualizer } from '../../src/chord-visualizer.js'
import { noteArrangements } from '../../src/note-arrangement.js'

const dom = new JSDOM('<div id="vis"></div>')
globalThis.document = dom.window.document
const element = document.getElementById('vis')
const fixtureURL = new URL('../fixtures/layouts.json', import.meta.url)
function describeLayout(id) {
    new ChordVisualizer(element, new MidiDevice(), { noteArrangement: id })
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
for (const { id } of noteArrangements.filter(({ grid }) => grid !== 'piano')) test(`${id} preserves cell labels and geometry`, () => {
    assert.deepEqual(describeLayout(id), fixtures[id])
})
test('notes remain lit while another channel holds the same pitch', () => {
    const device = new MidiDevice()
    const vis = new ChordVisualizer(element, device)
    device.noteOn(60, 50, 1)
    device.noteOn(60, 100, 2)
    device.noteOff(60, 0, 1)
    assert.equal(element.style.getPropertyValue('--v-max-60'), '1')
    device.noteOff(60, 0, 2)
    assert.equal(element.style.getPropertyValue('--v-max-60'), '0')
})
test('a shared state drives both views and clears old pitch after offset changes', async () => {
    const { ChordPrinter } = await import('../../src/chord-printer.js')
    const device = new MidiDevice()
    const printer = new ChordPrinter(device, { console: { log() {} } })
    const vis = new ChordVisualizer(element, device)
    for (const note of [60, 64, 67]) device.noteOn(note, 100, 1)
    assert.equal(printer.currentChord, 'C')
    assert.equal(element.style.getPropertyValue('--v-max-60'), '1')
    device.setNoteOffset(12, 1)
    assert.equal(element.style.getPropertyValue('--v-max-60'), '0')
    assert.equal(element.style.getPropertyValue('--v-max-72'), '1')
    device.clear()
    assert.equal(element.style.getPropertyValue('--v-max-72'), '0')
    vis.dispose()
    printer.dispose()
})

test('octave folding tracks overlapping notes, live toggles, offsets and clear', () => {
    const target = dom.window.document.createElement('div')
    const device = new MidiDevice()
    const vis = new ChordVisualizer(target, device)
    const lit = note => target.style.getPropertyValue(`--v-max-${note}`)
    device.noteOn(60, 100, 1)
    device.noteOn(72, 80, 2)
    vis.updateOptions({ ignoreOctave: true })
    assert.equal(lit(0), '1')
    assert.equal(lit(60), '0')
    assert.equal(target.querySelectorAll('sub').length, 0)
    device.noteOff(60, 0, 1)
    assert.equal(lit(0), '1')
    device.setNoteOffset(1, 2)
    assert.equal(lit(0), '0')
    assert.equal(lit(1), '1')
    vis.updateOptions({ ignoreOctave: false })
    assert.equal(lit(1), '0')
    assert.equal(lit(73), '1')
    assert.ok(target.querySelector('sub'))
    vis.updateOptions({ ignoreOctave: true })
    device.noteOff(72, 0, 2)
    assert.equal(lit(1), '0')
    device.setNoteOffset(-12, 1)
    device.noteOn(1, 100, 1)
    assert.equal(lit(1), '1')
    device.clear()
    assert.equal(lit(1), '0')
    vis.dispose()
})

for (const { id } of noteArrangements) test(`${id} folds all cells by pitch class without octave labels`, () => {
    const target = dom.window.document.createElement('div')
    const device = new MidiDevice()
    const vis = new ChordVisualizer(target, device, { noteArrangement: id, ignoreOctave: true, colorScheme: 'quintave' })
    assert.equal(target.querySelectorAll('sub').length, 0)
    const cells = [...target.querySelectorAll('.note-fg')]
    const cCells = cells.filter(cell => cell.style.color.includes('var(--v-max-0,'))
    assert.ok(cCells.length > 1)
    assert.equal(new Set(cCells.map(cell => cell.style.backgroundColor)).size, 1)
    assert.ok(cells.every(cell => /var\(--v-max-(?:[0-9]|1[01]),/.test(cell.style.color)))
    device.noteOn(60, 100, 1)
    assert.equal(target.style.getPropertyValue('--v-max-0'), '1')
    device.noteOff(60, 0, 1)
    assert.equal(target.style.getPropertyValue('--v-max-0'), '0')
    vis.dispose()
})

test('channel colors retain all overlapping channels through folding, offsets and release', () => {
    const target = dom.window.document.createElement('div')
    const device = new MidiDevice()
    const vis = new ChordVisualizer(target, device, { colorScheme: 'channel' })
    const fill = note => target.style.getPropertyValue(`--channel-fill-${note}`)
    device.noteOn(60, 100, 1)
    const channel1 = fill(60)
    device.noteOn(60, 80, 2)
    assert.match(fill(60), /0% 50%/)
    assert.match(fill(60), /50% 100%/)
    device.noteOff(60, 0, 2)
    assert.equal(fill(60), channel1)
    device.noteOn(72, 100, 2)
    vis.updateOptions({ ignoreOctave: true })
    assert.match(fill(0), /0% 50%/)
    device.noteOn(48, 100, 1)
    assert.match(fill(0), /50% 100%/)
    device.noteOff(60, 0, 1)
    assert.match(fill(0), /0% 50%/)
    device.setNoteOffset(1, 2)
    assert.doesNotMatch(fill(0), /50%/)
    assert.notEqual(fill(1), 'none')
    device.noteOn(61, 100, 10)
    device.noteOff(72, 0, 2)
    assert.equal(fill(1), 'none')
    vis.updateOptions({ colorScheme: 'fifth' })
    assert.equal(target.querySelector('.note-fg').style.backgroundImage, '')
    vis.updateOptions({ colorScheme: 'channel' })
    assert.notEqual(fill(0), 'none')
    device.clear()
    assert.equal(fill(0), 'none')
    vis.dispose()
})
