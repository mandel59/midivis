import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chordName, noteName, keyName, findRootNote } from '../../src/chord.js'

for (const [notes, name] of [
    [[], ''], [[60], 'C{1}'], [[60, 64, 67], 'C'], [[60, 63, 67], 'Cm'],
    [[60, 64, 67, 70], 'C7'], [[60, 64, 67, 71], 'CM7'],
    [[64, 67, 72], 'C/E'], [[60, 61, 62], 'C{1,m2,2}'],
    [[60, 62, 67], 'Csus2'], [[60, 65, 67], 'Csus4'],
]) test(`chord ${notes} → ${name}`, () => assert.equal(chordName(notes), name))

test('input ordering does not change recognition or mutate input', () => {
    const notes = [67, 60, 64]
    assert.equal(chordName(notes), 'C')
    assert.deepEqual(notes, [67, 60, 64])
    assert.equal(chordName([60, 64, 67, 72]), 'C')
    assert.equal(findRootNote([]), undefined)
})
test('note names, accidentals and degrees', () => {
    assert.equal(noteName(0), 'C-1')
    assert.equal(noteName(127), 'G9')
    assert.equal(noteName(61), 'Db4')
    assert.equal(noteName(61, { sharp: true }), 'C#4')
    assert.equal(keyName(7, { useDegree: true, scaleKey: 0 }), 'V')
    assert.equal(chordName([62, 66, 69], { useDegree: true, scaleKey: 2 }), 'I')
    assert.equal(chordName([61, 65, 68], { sharp: true }), 'C#')
})
