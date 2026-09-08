import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MidiDevice } from '../../src/midi-device.js'
import { ChordPrinter } from '../../src/chord-printer.js'

test('note lifecycle, velocity zero and independent channels', () => {
    const device = new MidiDevice()
    device.midiMessageHandler(undefined, [0x90, 60, 80])
    device.midiMessageHandler(undefined, [0x91, 60, 100])
    assert.deepEqual(device.notes(), [60])
    assert.equal(Math.max(...device.velocities(60)), 100)
    device.midiMessageHandler(undefined, [0x90, 60, 0])
    assert.deepEqual(device.notes(), [60])
    device.midiMessageHandler(undefined, [0x81, 60, 50])
    assert.deepEqual(device.notes(), [])
})
test('filter, percussion, program and offset', () => {
    const device = new MidiDevice(2)
    device.setNoteOffset(12, 2)
    device.midiMessageHandler(undefined, [0x90, 60, 80])
    device.midiMessageHandler(undefined, [0x91, 60, 80])
    device.midiMessageHandler(undefined, [0xC1, 40])
    assert.deepEqual(device.notes(), [72])
    assert.equal(device.programs[1], 40)
    const all = new MidiDevice()
    all.midiMessageHandler(undefined, [0x99, 36, 127])
    assert.deepEqual(all.notes(), [])
    assert.equal(Math.max(...all.velocities(36)), 0)
})
test('channel mode messages release melodic notes on the target channel', () => {
    for (const cc of [120, 121, 123]) {
        const device = new MidiDevice()
        device.noteOn(60, 100, 1)
        device.noteOn(64, 100, 2)
        device.midiMessageHandler(undefined, [0xB0, cc, 0])
        assert.deepEqual(device.notes(), [64])
    }
})
test('recent notes use note-on time, include exact boundary and exclude percussion', t => {
    let now = 1000
    t.mock.method(performance, 'now', () => now)
    const device = new MidiDevice()
    device.noteOn(60, 100, 1)
    device.noteOn(36, 100, 10)
    device.noteOff(60, 0, 1)
    now = 1200
    assert.deepEqual(device.reverbNotes(200), [60])
    now++
    assert.deepEqual(device.reverbNotes(200), [])
    device.noteOn(64, 100, 1)
    now += 1000
    assert.deepEqual(device.reverbNotes(200), [64])
})
test('printer notifies on note-on chord changes and retains chord on release', () => {
    const changes = []
    const printer = new ChordPrinter(0, { console: { log() {} }, onChordChange: c => changes.push(c) })
    for (const note of [60, 64, 67, 67]) printer.noteOn(note, 100, 1)
    assert.equal(changes.at(-1), 'C')
    assert.equal(changes.length, 3)
    printer.noteOff(67, 0, 1)
    assert.equal(changes.length, 3)
})
