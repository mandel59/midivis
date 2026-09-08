import { UIError } from './i18n.js'
import { MidiDevice } from './midi-device.js'
import { ChordPrinter } from './chord-printer.js'
import { ChordVisualizer } from './chord-visualizer.js'
import { createSettingsUI } from './settings-ui.js'

/**
 * Composition root. Importing this module does not access the DOM or MIDI API.
 * @param {{document: Document, midi: import('./midi-port-selector-webmidi.js').MidiInputPortSelector,
 * store: ReturnType<import('./state.js').createStateStore>}} dependencies
 */
export async function startApplication({ document, midi, store }) {
    await store.loadState()
    const element = document.getElementById('chordvis')
    const indicator = document.getElementById('chordindicator')
    if (!element || !indicator) throw new Error('Visualizer elements not found')
    const device = new MidiDevice()
    const state = store.getStateAll()
    const printer = new ChordPrinter(device, {
        sharp: state.sharp, useDegree: state.useDegree, scaleKey: state.key,
        onChordChange: chord => { if (chord) indicator.textContent = chord },
    })
    const visualizer = new ChordVisualizer(element, device, state)
    let selection = 0
    const ui = createSettingsUI(document, store, {
        listPorts: () => midi.portOptions(),
        async selectPort(id) {
            const current = ++selection
            const ok = id ? await midi.openPortByName(id) : (await midi.closePort(), true)
            if (current !== selection) return
            if (ok) store.updateState({ midiInputPortName: id || null })
            else throw new UIError('errorMissingInput')
        },
    })
    function reflectPerformanceOptions() {
        const state = store.getStateAll()
        printer.updateOptions({ sharp: state.sharp, useDegree: state.useDegree, scaleKey: state.key })
        visualizer.updateOptions(state)
        for (let i = 0; i < 16; i++) device.setNoteOffset(state.noteOffsets[i] ?? 0, i + 1)
    }
    reflectPerformanceOptions()
    const unsubscribe = store.subscribeState(reflectPerformanceOptions)
    /** @param {number} timestamp @param {Uint8Array} data */
    const onMessage = (timestamp, data) => device.midiMessageHandler(timestamp, data)
    const onDisconnect = () => device.clear()
    const onPortsChange = () => { ui.refreshPorts().catch(ui.handleError) }
    midi.on('portschange', onPortsChange)
    midi.on('message', onMessage)
    midi.on('disconnect', onDisconnect)
    midi.on('connectionError', ui.handleError)
    try {
        const name = store.getState('midiInputPortName')
        if (!name || !await midi.openPortByName(name)) await ui.showConfigDialog()
    } catch (error) { ui.handleError(error) }
    return {
        device,
        async dispose() {
            selection++
            unsubscribe()
            ui.dispose()
            printer.dispose()
            visualizer.dispose()
            midi.off('portschange', onPortsChange)
            midi.off('message', onMessage)
            midi.off('disconnect', onDisconnect)
            midi.off('connectionError', ui.handleError)
            device.clear()
            await midi.dispose()
        },
    }
}
