import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createStateStore, defaultState, normalizeState, storageKey } from '../../src/state.js'

function memoryStorage(value = null) {
    return { getItem: () => value, setItem(key, next) { assert.equal(key, storageKey); value = next } }
}
test('loads legacy names and valid settings while rejecting invalid fields', async () => {
    const store = createStateStore({ storage: memoryStorage(JSON.stringify({
        midiInputPortName: 'Old Keyboard', sharp: true, noteArrangement: 'tonnetz', colorScheme: 'missing',
        key: 99, mode: 4096, noteOffsets: [12, null, -24, '3', 25], unknown: true,
    })) })
    await store.loadState()
    assert.deepEqual(store.getStateAll(), { ...defaultState(), midiInputPortName: 'Old Keyboard', sharp: true,
        noteArrangement: 'tonnetz', noteOffsets: [12, 0, -24, 0, 0] })
    assert.deepEqual(normalizeState(null), defaultState())
    assert.deepEqual(normalizeState([]), defaultState())
})
test('corrupt JSON and denied storage fall back without rejecting startup', async () => {
    for (const storage of [memoryStorage('{'), { getItem() { throw new Error('denied') }, setItem() {} }]) {
        const errors = []
        const store = createStateStore({ storage, onError: error => errors.push(error) })
        await store.loadState()
        assert.deepEqual(store.getStateAll(), defaultState())
        assert.equal(errors.length, 1)
    }
})
test('arrays are detached on both reads and writes, no-op updates do not notify', () => {
    const store = createStateStore({ storage: memoryStorage() })
    let changes = 0
    const stop = store.subscribeState(() => changes++)
    const offsets = [12]
    store.updateState({ noteOffsets: offsets })
    offsets[0] = 24
    store.getStateAll().noteOffsets[0] = -12
    store.getState('noteOffsets')[0] = 0
    assert.deepEqual(store.getState('noteOffsets'), [12])
    store.updateState({ noteOffsets: [12] })
    assert.equal(changes, 1)
    stop()
    store.updateState({ sharp: true })
    assert.equal(changes, 1)
})
test('failed saves still update and notify; stores are independent', () => {
    const errors = []
    const store = createStateStore({ storage: { getItem() { return null }, setItem() { throw new Error('quota') } }, onError: e => errors.push(e) })
    let changes = 0
    store.subscribeState(() => changes++)
    store.updateState({ sharp: true })
    assert.equal(store.getState('sharp'), true)
    assert.equal(changes, 1)
    assert.equal(errors.length, 1)
    assert.equal(createStateStore({ storage: memoryStorage() }).getState('sharp'), false)
})
