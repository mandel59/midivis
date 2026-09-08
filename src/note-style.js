/**
 * @param {number} key
 * @param {number} mode
 * @param {number} note
 */
export function inScale(key, mode, note) {
    return (mode & (1 << ((note - key + 1200) % 12))) !== 0
}

/**
 * @param {number} key
 * @param {number} note
 */
export function isTonicNote(key, note) {
    return (note + 1200) % 12 === key
}

/**
 * @param {number} acc
 */
function accidental(acc) {
    let s
    if (acc < -2) s = `<sup>${-acc}♭</sup>`
    else if (acc > 2) s = `<sup>${acc}♯</sup>`
    else if (acc === -2) s = "<sup>𝄫</sup>"
    else if (acc === -1) s = "<sup>♭</sup>"
    else if (acc === 1) s = "<sup>♯</sup>"
    else if (acc === 2) s = "<sup>𝄪</sup>"
    else s = ""
    return s
}


/** @param {number} note @param {{ignoreOctave?: boolean, sharp: boolean, arrangement: NoteArrangement, x: number, y: number, base: number}} options */
export function cellNoteName(note, { sharp, arrangement, x, y, base, ignoreOctave = false }) {
    let k
    if (arrangement === 'wicki-hayden' || arrangement === 'wicki-hayden-wide') {
        k = 2 * x + y + ((7 * base) % 12)
        if (arrangement === 'wicki-hayden-wide') k -= 12
    } else {
        const shift = sharp ? -1 : -6
        k = (7 * note - shift + 1200) % 12 + shift
    }
    const n = "CGDAEBF"[(700 + k) % 7]
    const acc = Math.floor((k + 1) / 7)
    const octave = Math.floor((note - acc) / 12) - 1
    return `${n}${accidental(acc)}${ignoreOctave ? "" : `<sub>${octave}</sub>`}`
}

/** @param {number} note @param {ColorScheme} scheme @param {string} alpha */
export function noteColor(note, scheme, alpha) {
    if (scheme === 'chromatic') return `hsla(${note * (360 / 12)}deg, 70%, 75%, ${alpha})`
    if (scheme === 'fifth') return `hsla(${note * (360 / 12 * 7)}deg, 70%, 75%, ${alpha})`
    if (scheme === 'axis') return `hsla(${note * (360 / 3) + 240}deg, 70%, 75%, ${alpha})`
    if (scheme === 'quintave') return `hsla(${note * (360 / 7)}deg, 70%, 75%, ${alpha})`
    if (scheme === 'third-major') return `hsla(${note * (360 / 4)}deg, 70%, 75%, ${alpha})`
    return `hsla(240deg, 100%, 75%, ${alpha})`
}

// Gb Db Ab Eb Bb F C G D A E B
const modeShapeCode = [6, 1, 8, 3, 10, 5, 0, 7, 2, 9, 4, 11]
const modeShapeBase = modeShapeCode.indexOf(0)

/**
 * @param {number} key 
 * @param {number} mode 
 * @param {boolean} [sharp]
 * @returns {boolean}
 */
export function isSharpKey(key, mode, sharp = false) {
    const offset = modeShapeCode.indexOf(key) - modeShapeBase
    const left = modeShapeCode.findIndex(key => (mode >> key) & 1) - modeShapeBase
    sharp = left + offset === -7 ? sharp : (left + offset < -7 || left + offset >= 0)
    return sharp
}


/** Fixed channel colors, shared by the visualization and legend. @param {number} channel @param {string} [alpha] */
export function channelColor(channel, alpha = '1') {
    return `hsla(${((channel - 1) * 137.5) % 360}deg, 70%, 75%, ${alpha})`
}

/** Equal-width bands preserve every active channel, independent of note-on order.
 * @param {number[]} channels @param {string} alpha
 */
export function channelFill(channels, alpha) {
    const unique = [...new Set(channels)].sort((a, b) => a - b)
    if (!unique.length) return 'none'
    return `linear-gradient(to right, ${unique.map((channel, i) => `${channelColor(channel, alpha)} ${i * 100 / unique.length}% ${(i + 1) * 100 / unique.length}%`).join(', ')})`
}
