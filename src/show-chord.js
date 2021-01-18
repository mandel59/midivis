const midi = require('midi')
const { ChordPrinter } = require('./chord-printer')

const input = new midi.Input()
const pc = input.getPortCount()
if (pc === 0) {
    console.error("No MIDI port found")
    process.exit(1)
}
input.openPort(0)

const printer = new ChordPrinter()

input.on("message", (deltaTime, message) => {
    printer.midiMessageHandler(deltaTime, message)
})

process.on("SIGINT", () => {
    input.closePort()
    console.log("SIGINT")
    process.exit(0)
})
