function compareNumber(a, b) {
    return a - b
}

function sum(...nums) {
    if (nums.length === 0) return 0
    return nums.reduce((x, y) => x + y)
}

const degreeNames = [
    "1",
    "m2",
    "2",
    "m3",
    "3",
    "4",
    "o5",
    "5",
    "m6",
    "6",
    "m7",
    "M7",
]

const qualityMap = {
    "1,2,5": "sus2",
    "1,2,5,6": "6sus2",
    "1,2,5,m7": "7sus2",
    "1,2,5,M7": "M7sus2",
    "1,3,5": "",
    "1,3": "(omit5)",
    "1,3,4,5": "(11)",
    "1,m3,o5": "m(-5)",
    "1,m3,o5,6": "m6(-5)",
    "1,m3,o5,m7": "m7(-5)",
    "1,m3,5": "m",
    "1,m3": "m(omit5)",
    "1,m3,5,6": "m6",
    "1,m3,6": "m6(omit5)",
    "1,m3,m6,6": "m6(+5)",
    "1,2,m3,5,6": "m6(9)",
    "1,2,m3,6": "m6(9)(omit5)",
    "1,m3,m7": "m7(omit5)",
    "1,m3,5,m7": "m7",
    "1,m3,M7": "mM7(omit5)",
    "1,m3,5,M7": "mM7",
    "1,m2,m3,5": "m(-9)",
    "1,2,m3,5": "m(9)",
    "1,m3,4,5": "m(11)",
    "1,m2,m3,5,m7": "m7(-9)",
    "1,2,m3,5,m7": "m7(9)",
    "1,2,m3,m7": "m7(9)(omit5)",
    "1,2,m3,5,m7": "m7(9)",
    "1,2,m3,4,m7": "m7(9,11)(omit5)",
    "1,2,m3,4,5,m7": "m7(9,11)",
    "1,2,m3,5,6,m7": "m7(9,13)",
    "1,2,m3,4,5,6,m7": "m7(9,11,13)",
    "1,m3,4,5,m7": "m7(11)",
    "1,m3,4,m7": "m7(11)(omit5)",
    "1,m3,o5,5": "m(+11)",
    "1,m3,o5,5,m7": "m7(+11)",
    "1,m3,5,6,m7": "m7(13)",
    "1,m3,6,m7": "m7(13)(omit5)",
    "1,5": "5",
    "1,3,5,6": "6",
    "1,5,6": "6(omit3)",
    "1,2,3,5,6": "6(9)",
    "1,2,3,6": "6(9)(omit5)",
    "1,o5": "(-5)(omit3)",
    "1,3,o5": "(-5)",
    "1,m3,3,o5": "(-5,+9)",
    "1,3,m7": "7(omit5)",
    "1,5,m7": "7(omit3)",
    "1,5,6,m7": "7(13)(omit3)",
    "1,3,M7": "M7(omit5)",
    "1,3,o5,M7": "M7(-5)",
    "1,m3,3,o5,M7": "M7(-5,+9)",
    "1,m3,3,5,M7": "M7(+9)",
    "1,m3,3,M7": "M7(+9)(omit5)",
    "1,5,m6": "(-13)(omit3)",
    "1,3,5,m6": "(-13)",
    "1,3,5,m7": "7",
    "1,3,o5,m7": "7(-5)",
    "1,2,3,5": "(9)",
    "1,m3,3,5": "(+9)",
    "1,m2,3,5,m7": "7(-9)",
    "1,m2,3,m7": "7(-9)(omit5)",
    "1,m2,3,4,5,m7": "7(-9,11)",
    "1,m2,3,4,m7": "7(-9,11)(omit5)",
    "1,2,3,5,m7": "7(9)",
    "1,2,3,4,5,m7": "7(9,11)",
    "1,2,3,5,6,m7": "7(9,13)",
    "1,2,3,4,5,6,m7": "7(9,11,13)",
    "1,2,3,m7": "7(9)(omit5)",
    "1,2,3,4,m7": "7(9,11)(omit5)",
    "1,2,3,6,m7": "7(9,13)(omit5)",
    "1,2,3,4,6,m7": "7(9,11,13)(omit5)",
    "1,m3,3,5,m7": "7(+9)",
    "1,m3,3,m6,m7": "7(+5,+9)",
    "1,m3,3,m7": "7(+9)(omit5)",
    "1,3,4,5,m7": "7(11)",
    "1,3,o5,5,m7": "7(+11)",
    "1,3,5,m6,m7": "7(-13)",
    "1,3,5,6,m7": "7(13)",
    "1,5,M7": "M7(omit3)",
    "1,3,5,M7": "M7",
    "1,2,3,5,M7": "M7(9)",
    "1,2,3,o5,5,M7": "M7(9,+11)",
    "1,3,4,M7": "M7(11)(omit5)",
    "1,3,4,5,M7": "M7(11)",
    "1,3,o5,5,M7": "M7(+11)",
    "1,3,5,6,M7": "M7(13)",
    "1,2,3,5,m6,M7": "M7(9,-13)",
    "1,2,3,4,m6,6,M7": "M7(+5,9,11,13)",
    "1,3,m6": "(+5)",
    "1,3,m6,m7": "7(+5)",
    "1,m6,m7": "7(+5)(omit3)",
    "1,m2,3": "(-9)(omit5)",
    "1,m2,m3": "m(-9)(omit5)",
    "1,2,m3": "m(9)(omit5)",
    "1,2,m3,m6": "m(+5,9)",
    "1,2,m3,m6,m7": "m7(+5,9)",
    "1,4,5": "sus4",
    "1,4,o5": "sus4(-5)",
    "1,4,5,6": "6sus4",
    "1,4,5,m7": "7sus4",
    "1,4,5,M7": "M7sus4",
    "1,m3,o5,5,M7": "mM7(+11)",
    "1,m3,o5,5,6,M7": "mM7(+11,13)",
}

function degreeName(semitone) {
    return degreeNames[(semitone + 12) % 12]
}

function keyOfNote(note) {
    return (note % 12) | 0
}

function octaveOfNote(note) {
    return ((note / 12) | 0) - 1
}

const keyNames = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
]

const sharpKeyNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
]

const chordDegreeNames = [
    "I",
    "#I",
    "II",
    "bIII",
    "III",
    "IV",
    "#IV",
    "V",
    "bVI",
    "VI",
    "bVII",
    "VII",
]

function keyName(key, { sharp = false, useDegree = false, scaleKey = 0 } = {}) {
    if (useDegree) {
        return chordDegreeNames[(key - scaleKey + 1200) % 12]
    }
    if (sharp) {
        return sharpKeyNames[key]
    }
    return keyNames[key]
}

function noteName(note, { sharp = false } = {}) {
    const key = keyOfNote(note, { sharp })
    const octave = octaveOfNote(note)
    return `${keyName(key)}${octave}`
}

function findRootNote(notes) {
    const noteList = [...notes]
    if (noteList.length === 0) return undefined
    const scoreMap = [0, 1, 2, -3, -4, 5, 0, -5, 4, 3, -2, -1]
    /** @type {[number, number][]} */
    const scoreOfNotes = noteList.map(note => {
        const k = keyOfNote(note)
        const noteScores = noteList.map(n => scoreMap[(keyOfNote(n) - k + 12) % 12])
        const score
            = sum(...noteScores) * 256
            + note
        return [note, score]
    }).sort((a, b) => a[1] - b[1])
    return scoreOfNotes
}

function quality(keys, rootKey) {
    const intervals = [...keys].map(k => (k - rootKey + 12) % 12).sort(compareNumber)
    const degrees = intervals.map(degreeName)
    const degreesJoin = degrees.join()
    return { degreesJoin, quality: qualityMap[degreesJoin] }
}

function chordName(notes, {
    sharp = false,
    useDegree = false,
    scaleKey = 0,
} = {}) {
    const noteList = [...notes]
    if (noteList.length === 0) return ""

    const keys = new Set([...notes].map(keyOfNote))
    const baseNote = Math.min(...noteList)
    const baseKey = keyOfNote(baseNote)
    const { degreesJoin, quality: q1 } = quality(keys, baseKey)
    if (q1 != null) {
        return `${keyName(baseKey, { sharp, useDegree, scaleKey })}${q1}`
    }
    const rootNoteCandidates = findRootNote(noteList)
    for (const [rootNote, _score] of rootNoteCandidates) {
        const rootKey = keyOfNote(rootNote)
        if (baseKey === rootKey) continue
        const { quality: q2 } = quality(keys, rootKey)
        if (q2 != null) {
            return `${keyName(rootKey, { sharp, useDegree, scaleKey })
                }${q2}/${keyName(baseKey, { sharp, useDegree, scaleKey })}`
        }
    }
    return `${keyName(baseKey, { sharp, useDegree, scaleKey })}{${degreesJoin}}`
}

module.exports = {
    noteName,
    keyName,
    chordName,
    findRootNote,
}
