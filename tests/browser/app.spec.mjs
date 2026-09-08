import { test, expect } from '@playwright/test'

async function setup(page, saved = null, denied = false) {
    await page.addInitScript(({ saved, denied }) => {
        if (saved) localStorage.setItem('midivisAppState', JSON.stringify(saved))
        const log = []
        const makePort = id => Object.assign(new EventTarget(), {
            id, name: 'Keyboard', state: 'connected',
            async open() { log.push(`open:${id}`) },
            async close() { log.push(`close:${id}`) },
        })
        const a = makePort('a'), b = makePort('b')
        const access = Object.assign(new EventTarget(), { inputs: new Map([['a', a], ['b', b]]) })
        Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => {
            if (denied) throw new Error('MIDI permission denied')
            return access
        } })
        window.fakeMIDI = {
            log,
            send(id, data) {
                access.inputs.get(id).dispatchEvent(Object.assign(new Event('midimessage'), { data: new Uint8Array(data) }))
            },
            unplug(id) {
                access.inputs.get(id).state = 'disconnected'
                access.dispatchEvent(new Event('statechange'))
            },
        }
    }, { saved, denied })
}
const send = (page, notes) => page.evaluate(notes => {
    for (const note of notes) window.fakeMIDI.send('a', [0x90, note, 100])
}, notes)
const velocity = (page, note) => page.locator('#chordvis').evaluate((element, note) => element.style.getPropertyValue(`--v-max-${note}`), note)

test('connect, play, change settings, transpose held notes and disconnect', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await setup(page)
    await page.goto('/')
    await expect(page.locator('#config')).toHaveClass(/shown/)
    await page.selectOption('#config-midi-input-port', 'a')
    await expect.poll(() => page.evaluate(() => window.fakeMIDI.log)).toEqual(['open:a'])
    await send(page, [60, 64, 67])
    await expect(page.locator('#chordindicator')).toHaveText('C')
    expect(await velocity(page, 60)).toBe('1')
    await page.evaluate(() => { window.previousKeyboard = document.querySelector('#chordvis > div') })
    await page.uncheck('#state-showToolbar')
    expect(await page.evaluate(() => window.previousKeyboard === document.querySelector('#chordvis > div'))).toBe(true)
    await page.selectOption('#state-noteArrangement', 'tonnetz')
    await page.check('#state-colorScheme-fifth')
    expect(await page.evaluate(() => window.fakeMIDI.log)).toEqual(['open:a'])
    await page.fill('#state-noteOffset', '12')
    await page.locator('#state-noteOffset').dispatchEvent('change')
    expect(await velocity(page, 60)).toBe('0')
    expect(await velocity(page, 72)).toBe('1')
    await page.evaluate(() => window.fakeMIDI.send('a', [0x80, 60, 0]))
    expect(await velocity(page, 72)).toBe('0')
    await page.selectOption('#config-midi-input-port', '')
    await expect.poll(() => page.evaluate(() => window.fakeMIDI.log)).toEqual(['open:a', 'close:a'])
    expect(await velocity(page, 76)).toBe('0')
    expect(errors).toEqual([])
})

test('saved legacy port connects once; unplugging releases held notes', async ({ page }) => {
    await setup(page, { midiInputPortName: 'Keyboard', noteArrangement: 'guitar' })
    await page.goto('/')
    await expect.poll(() => page.evaluate(() => window.fakeMIDI.log)).toEqual(['open:a'])
    await expect(page.locator('#state-noteArrangement')).toHaveValue('guitar')
    await send(page, [60])
    await page.evaluate(() => window.fakeMIDI.unplug('a'))
    await expect.poll(() => velocity(page, 60)).toBe('0')
    await expect.poll(() => page.evaluate(() => window.fakeMIDI.log)).toEqual(['open:a', 'close:a'])
})

test('permission errors are visible while settings remain usable', async ({ page }) => {
    await setup(page, null, true)
    await page.goto('/')
    await expect(page.locator('#oops')).toHaveClass(/shown/)
    await expect(page.locator('#oops-message')).toContainText('MIDI permission denied')
    await page.click('#oops-close')
    await page.selectOption('#state-noteArrangement', 'tonnetz')
    await expect(page.locator('#chordvis .note-bg')).toHaveCount(292)
})

for (const [layout, count] of [['fourth', 276], ['tonnetz', 292], ['janko-slanted', 1020]]) {
    test(`${layout} geometry and visual review`, async ({ page }, testInfo) => {
        await setup(page, { midiInputPortName: 'a', noteArrangement: layout, colorScheme: 'fifth' })
        await page.goto('/')
        await expect(page.locator('#chordvis .note-bg')).toHaveCount(count)
        await send(page, [60, 64, 67])
        await expect(page.locator('#chordindicator')).toHaveText('C')
        const cell = page.locator('#chordvis .note-bg:visible').first()
        expect((await cell.boundingBox()).width).toBeGreaterThan(0)
        if (layout === 'janko-slanted') {
            await expect(page.locator('#chordvis > div')).not.toHaveCSS('transform', 'none')
            expect(await page.locator('#chordvis .note-bg').evaluateAll(cells => cells.some(cell => getComputedStyle(cell).visibility === 'hidden'))).toBe(true)
        }
        await page.screenshot({ path: testInfo.outputPath(`${layout}.png`), fullPage: true })
    })
}

test('license page still includes bundled license text', async ({ page }) => {
    await page.goto('/about.html')
    await expect(page.locator('#licenses')).toContainText('Permission is hereby granted')
    await expect(page.locator('#licenses')).toContainText('Node.js License')
})
