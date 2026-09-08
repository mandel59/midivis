import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMidiMessage } from '../../src/midi-message.js'

test('decodes two-byte program changes and zero-velocity note-offs', () => {
    assert.deepEqual(parseMidiMessage(new Uint8Array([0xCF, 127]), 12), {
        kind: 'programChange', channel: 16, program: 127, timestamp: 12,
    })
    assert.deepEqual(parseMidiMessage([0x90, 60, 0], 15), {
        kind: 'noteOff', channel: 1, note: 60, velocity: 0, timestamp: 15,
    })
})
test('rejects malformed supported messages without corrupting state', () => {
    for (const data of [[], [0], [0x90], [0x90, 60], [0x90, -1, 100], [0x90, 60, 128], [0xC0, NaN]]) {
        assert.equal(parseMidiMessage(data, 0), null)
    }
    assert.equal(parseMidiMessage([0x90, 60, 100], NaN), null)
})
test('preserves unsupported messages for future consumers', () => {
    assert.deepEqual(parseMidiMessage([0xE1, 0, 64], 20), {
        kind: 'unknown', channel: 2, data: [0xE1, 0, 64], timestamp: 20,
    })
})
