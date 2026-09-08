import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MidiInputPortSelector } from '../../src/midi-port-selector-webmidi.js'

function setup() {
    const log = []
    const port = id => Object.assign(new EventTarget(), {
        id, name: 'Keyboard', state: 'connected',
        async open() { log.push(`open:${id}`) },
        async close() { log.push(`close:${id}`) },
    })
    const a = port('a'), b = port('b')
    const access = Object.assign(new EventTarget(), { inputs: new Map([['a', a], ['b', b]]) })
    let requests = 0
    const selector = new MidiInputPortSelector({ requestAccess: async () => { requests++; return access } })
    return { selector, a, b, access, log, requests: () => requests }
}
test('same port is idempotent, IDs distinguish duplicate names and access is cached', async () => {
    const { selector, log, requests } = setup()
    await selector.openPortByName('Keyboard')
    await selector.openPortByName('a')
    await selector.portOptions()
    assert.deepEqual(log, ['open:a'])
    assert.equal(requests(), 1)
    await selector.openPortByName('b')
    assert.deepEqual(log, ['open:a', 'close:a', 'open:b'])
    assert.equal((await selector.portOptions()).find(p => p.selected).id, 'b')
})
test('overlapping open/open/close commands settle in request order', async () => {
    const { selector, a, log } = setup()
    let finish
    a.open = () => new Promise(resolve => { log.push('open:a'); finish = resolve })
    const first = selector.openPortByName('a')
    const second = selector.openPortByName('b')
    const close = selector.closePort()
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(log, ['open:a'])
    finish()
    await Promise.all([first, second, close])
    assert.deepEqual(log, ['open:a', 'close:a', 'open:b', 'close:b'])
    assert.equal((await selector.portOptions()).some(p => p.selected), false)
})
test('messages retain timestamps and old listeners are removed', async () => {
    const { selector, a, b } = setup()
    const messages = []
    selector.on('message', (...args) => messages.push(args))
    const send = p => p.dispatchEvent(Object.assign(new Event('midimessage'), { data: new Uint8Array([0x90, 60, 100]) }))
    await selector.openPortByName('a')
    const event = Object.assign(new Event('midimessage'), { data: new Uint8Array([0xC0, 10]) })
    a.dispatchEvent(event)
    assert.equal(messages[0][0], event.timeStamp)
    assert.deepEqual([...messages[0][1]], [0xC0, 10])
    await selector.openPortByName('b')
    send(a)
    assert.equal(messages.length, 1)
    send(b)
    assert.equal(messages.length, 2)
    await selector.dispose()
    send(b)
    assert.equal(messages.length, 2)
})
test('missing ports preserve the active port, failed opens do not poison the queue', async () => {
    const { selector, b } = setup()
    await selector.openPortByName('a')
    assert.equal(await selector.openPortByName('missing'), false)
    assert.equal((await selector.portOptions()).find(p => p.selected).id, 'a')
    b.open = async () => { throw new Error('open failed') }
    await assert.rejects(selector.openPortByName('b'), /open failed/)
    assert.equal(await selector.openPortByName('a'), true)
})
test('unplugging the selected input detaches it and notifies once', async () => {
    const { selector, a, access, log } = setup()
    let disconnects = 0
    selector.on('disconnect', () => disconnects++)
    await selector.openPortByName('a')
    a.state = 'disconnected'
    access.dispatchEvent(new Event('statechange'))
    await selector.closePort()
    assert.equal(disconnects, 1)
    assert.deepEqual(log, ['open:a', 'close:a'])
    assert.equal((await selector.portOptions()).some(p => p.id === 'a'), false)
})
test('permission rejection can be retried', async () => {
    const { access } = setup()
    let requests = 0
    const selector = new MidiInputPortSelector({ requestAccess: async () => {
        if (!requests++) throw new Error('permission denied')
        return access
    } })
    await assert.rejects(selector.portOptions(), /permission denied/)
    assert.equal(await selector.openPortByName('a'), true)
})
