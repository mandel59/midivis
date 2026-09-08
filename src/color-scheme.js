/** @type {{ id: ColorScheme; label: string; category: "monotone" | "interval" | "circle"; key: string; code: string; }[]} */
export const colorSchemes = [
    { id: "monotone", category: "monotone", label: "Single color", key: "1", code: "Digit1" },
    { id: "chromatic", category: "interval", label: "12 semitones (octave)", key: "2", code: "Digit2" },
    { id: "fifth", category: "circle", label: "Circle of fifths", key: "3", code: "Digit3" },
    { id: "axis", category: "circle", label: "Axis system", key: "4", code: "Digit4" },
    { id: "quintave", category: "interval", label: "7 semitones (perfect fifth)", key: "5", code: "Digit5" },
    { id: "third-major", category: "interval", label: "4 semitones (major third)", key: "6", code: "Digit6" }
]
