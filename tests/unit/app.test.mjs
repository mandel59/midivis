import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { startApplication } from '../../src/app.js'
import { createStateStore } from '../../src/state.js'
import { MidiInputPortSelector } from '../../src/midi-port-selector-webmidi.js'

const html = readFileSync(new URL('../../src/public/index.html', import.meta.url), 'utf8')
async function mount(saved = { midiInputPortName: 'Keyboard' }) {
    const dom = new JSDOM(html, { url: 'https://midivis.test' })
    const log = []
    const port = Object.assign(new EventTarget(), {
        id: 'keyboard-id', name: 'Keyboard', state: 'connected',
        async open() { log.push('open') }, async close() { log.push('close') },
    })
    const access = Object.assign(new EventTarget(), { inputs: new Map([[port.id, port]]) })
    const midi = new MidiInputPortSelector({ requestAccess: async () => access })
    const store = createStateStore({ storage: { getItem: () => JSON.stringify(saved), setItem() {} } })
    const app = await startApplication({ document: dom.window.document, midi, store })
    return { dom, port, midi, store, app, log }
}
test('loads settings before connecting once; unrelated settings preserve keyboard and connection', async () => {
    const { dom, store, app, log } = await mount({ midiInputPortName: 'Keyboard', noteArrangement: 'tonnetz' })
    const document = dom.window.document
    const keyboard = document.querySelector('#chordvis > div')
    assert.equal(document.querySelector('#state-noteArrangement').value, 'tonnetz')
    assert.deepEqual(log, ['open'])
    store.updateState({ showToolbar: false, useDegree: true })
    assert.equal(document.querySelector('#chordvis > div'), keyboard)
    store.updateState({ colorScheme: 'fifth' })
    assert.notEqual(document.querySelector('#chordvis > div'), keyboard)
    assert.deepEqual(log, ['open'])
    await app.dispose()
    assert.deepEqual(log, ['open', 'close'])
    dom.window.close()
})
test('message fanout, UI offset changes, and disposal use a single state', async () => {
    const { dom, midi, store, app } = await mount()
    const document = dom.window.document
    for (const note of [60, 64, 67]) midi.emit('message', performance.now(), new Uint8Array([0x90, note, 100]))
    assert.equal(document.getElementById('chordindicator').textContent, 'C')
    assert.equal(document.getElementById('chordvis').style.getPropertyValue('--v-max-60'), '1')
    const offset = document.getElementById('state-noteOffset')
    offset.value = '12'
    offset.dispatchEvent(new dom.window.Event('change'))
    assert.deepEqual(app.device.notes(), [72, 76, 79])
    midi.emit('message', performance.now(), new Uint8Array([0x80, 60, 0]))
    assert.deepEqual(app.device.notes(), [76, 79])
    await app.dispose()
    store.updateState({ colorScheme: 'fifth' })
    assert.equal(midi.listenerCount('message'), 0)
    assert.deepEqual(app.device.notes(), [])
    dom.window.close()
})
test('no saved input opens settings with port IDs and keyboard shortcuts work', async () => {
    const { dom, store, app, log } = await mount({})
    const document = dom.window.document
    assert.ok(document.getElementById('config').classList.contains('shown'))
    assert.equal(document.querySelector('#config-midi-input-port option:last-child').value, 'keyboard-id')
    assert.deepEqual(log, [])
    dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { altKey: true, key: '2', code: 'Digit2' }))
    assert.equal(store.getState('colorScheme'), 'chromatic')
    await app.dispose()
    dom.window.close()
})
