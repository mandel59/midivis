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
    const device = new MidiDevice()
    const printer = new ChordPrinter(device, { console: { log() {} }, onChordChange: c => changes.push(c) })
    for (const note of [60, 64, 67, 67]) device.noteOn(note, 100, 1)
    assert.equal(changes.at(-1), 'C')
    assert.equal(changes.length, 3)
    device.noteOff(67, 0, 1)
    assert.equal(changes.length, 3)
})
test('injected clock uses event timestamps for the recent-note window', () => {
    let now = 1000
    const device = new MidiDevice(undefined, { now: () => now })
    device.midiMessageHandler(800, [0x90, 60, 100])
    device.midiMessageHandler(950, [0x80, 60, 0])
    assert.deepEqual(device.reverbNotes(200), [60])
    now = 1001
    assert.deepEqual(device.reverbNotes(200), [])
})
test('changing offsets while held does not lose the matching note-off', () => {
    const device = new MidiDevice()
    device.midiMessageHandler(0, [0x90, 60, 100])
    device.setNoteOffset(12, 1)
    assert.deepEqual(device.notes(), [72])
    assert.equal(Math.max(...device.velocities(60)), 0)
    assert.equal(Math.max(...device.velocities(72)), 100)
    device.midiMessageHandler(1, [0x80, 60, 0])
    assert.deepEqual(device.notes(), [])
})
test('channel release clears percussion state too; disconnect clears history and programs', () => {
    const device = new MidiDevice(undefined, { now: () => 100 })
    device.noteOn(36, 100, 10)
    device.allNoteOff(10)
    assert.equal(device.noteVelocityMaps[9].size, 0)
    device.noteOn(60, 100, 1)
    device.programChange(10, 1)
    device.clear()
    assert.deepEqual(device.notes(), [])
    assert.deepEqual(device.reverbNotes(200), [])
    assert.equal(device.programs[0], 0)
})
test('subscriptions can be disposed without affecting other consumers', () => {
    const device = new MidiDevice()
    let calls = 0
    const stop = device.subscribe(() => calls++)
    device.noteOn(60, 100, 1)
    stop()
    device.noteOff(60, 0, 1)
    assert.equal(calls, 1)
})
test('printer reformats retained chords immediately when naming options change', () => {
    let now = 1000
    const device = new MidiDevice(undefined, { now: () => now })
    const changes = []
    const printer = new ChordPrinter(device, { console: { log() {} }, onChordChange: chord => changes.push(chord) })
    for (const note of [61, 65, 68]) device.noteOn(note, 100, 1)
    assert.equal(printer.currentChord, 'Db')
    for (const note of [61, 65, 68]) device.noteOff(note, 0, 1)
    now += 1000
    printer.updateOptions({ sharp: true, useDegree: false, scaleKey: 0 })
    assert.equal(printer.currentChord, 'C#')
    printer.updateOptions({ sharp: true, useDegree: true, scaleKey: 1 })
    assert.equal(printer.currentChord, 'I')
    const count = changes.length
    printer.updateOptions({ sharp: true, useDegree: true, scaleKey: 1 })
    assert.equal(changes.length, count)
})
