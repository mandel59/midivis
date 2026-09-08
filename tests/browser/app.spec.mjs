import { test, expect } from '@playwright/test'

async function setup(page, saved = null, denied = false) {
    await page.addInitScript(({ saved, denied }) => {
        if (saved) localStorage.setItem('midivisAppState', JSON.stringify(saved))
        const log = []
        const makePort = id => Object.assign(new EventTarget(), {
            id, name: 'Keyboard', state: 'connected',
            async open() { log.push(`open:${id}`); if (this.wait) await new Promise(resolve => { this.resume = resolve }); if (this.fail) throw new Error('Device connection failed') },
            async close() { log.push(`close:${id}`) },
        })
        const a = makePort('a'), b = makePort('b')
        const access = Object.assign(new EventTarget(), { inputs: new Map([['a', a], ['b', b]]) })
        let requests = 0
        Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => {
            requests++
            if (denied) throw new Error('MIDI permission denied')
            return access
        } })
        window.fakeMIDI = {
            log,
            requests: () => requests,
            grant() { denied = false },
            pause(id) { access.inputs.get(id).wait = true },
            resume(id) { access.inputs.get(id).resume() },
            add(id, name) {
                const port = makePort(id)
                port.name = name
                access.inputs.set(id, port)
                access.dispatchEvent(new Event('statechange'))
            },
            fail(id) { access.inputs.get(id).fail = true },
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

test('settings close with Escape, leave tab order, and remain reachable without toolbar', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    await expect(page.locator('#config-close')).toBeFocused()
    await expect(page.locator('#menu-settings')).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(page.locator('#config')).toBeHidden()
    await expect(page.locator('#menu-settings')).toBeFocused()
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.getElementById('config').contains(document.activeElement))).toBe(false)
    await page.click('#menu-settings')
    await page.uncheck('#state-showToolbar')
    await page.click('#config-close')
    await expect(page.locator('#menu-settings')).toBeVisible()
    await expect(page.locator('#menu-settings')).toBeFocused()
    await page.click('#menu-settings')
    await expect(page.locator('#config-close')).toBeFocused()
    await page.reload()
    await expect(page.locator('#toolbar')).toBeHidden()
    await expect(page.locator('#menu-settings')).toBeVisible()
})

test('chord names update immediately and invalid transpose keeps the saved setting', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    await page.selectOption('#config-midi-input-port', 'a')
    await expect(page.locator('#midi-status')).toContainText('Connected:')
    await send(page, [62, 66, 69])
    await expect(page.locator('#chordindicator')).toHaveText('D')
    await page.check('#state-useDegree')
    await expect(page.locator('#chordindicator')).toHaveText('II')
    await page.selectOption('#state-key', '2')
    await expect(page.locator('#chordindicator')).toHaveText('I')
    const offset = page.locator('#state-noteOffset')
    await offset.fill('12')
    await offset.dispatchEvent('change')
    expect(await velocity(page, 74)).toBe('1')
    await offset.fill('25')
    await offset.dispatchEvent('change')
    await expect(offset).toHaveValue('25')
    await expect(offset).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#offset-error')).toBeVisible()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('midivisAppState')).noteOffsets[0])).toBe(12)
    expect(await velocity(page, 74)).toBe('1')
    await page.click('#config-close')
    await page.click('#menu-settings')
    await expect(offset).toHaveValue('12')
    await expect(page.locator('#offset-error')).toBeHidden()
    await offset.fill('-1')
    await offset.dispatchEvent('change')
    await expect(page.locator('#chordindicator')).toHaveText('VII')
})

test('port discovery, unplugging and failed selection show actual connection state', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    await expect(page.locator('#config-midi-input-port option[value="a"]')).toHaveText('Keyboard (a)')
    await expect(page.locator('#config-midi-input-port option[value="b"]')).toHaveText('Keyboard (b)')
    await page.selectOption('#config-midi-input-port', 'a')
    await expect(page.locator('#midi-status')).toContainText('Connected:')
    await page.evaluate(() => window.fakeMIDI.add('c', 'New input'))
    await expect(page.locator('#config-midi-input-port option[value="c"]')).toHaveCount(1)
    await page.evaluate(() => window.fakeMIDI.unplug('a'))
    await expect(page.locator('#config-midi-input-port')).toHaveValue('')
    await expect(page.locator('#midi-status')).toContainText('Not connected')
    await page.evaluate(() => window.fakeMIDI.fail('b'))
    await page.selectOption('#config-midi-input-port', 'b')
    await expect(page.locator('#oops-message')).toHaveText('Device connection failed')
    await expect(page.locator('#config-midi-input-port')).toHaveValue('')
    await expect(page.locator('#midi-status')).toContainText('Not connected')
    await expect(page.locator('#oops')).not.toContainText('Firefox 98')
    await page.click('#oops-close')
    await page.selectOption('#config-midi-input-port', 'c')
    await expect(page.locator('#midi-status')).toHaveText('Connected: New input')
})

for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 667 }]) {
    test(`settings fit ${viewport.width}px including long device names`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport)
        await setup(page)
        await page.goto('/')
        await page.evaluate(() => window.fakeMIDI.add('long', 'A very long USB MIDI controller input port name - MIDI 1 - USB connection'))
        await expect(page.locator('#config-midi-input-port option[value="long"]')).toHaveCount(1)
        await page.selectOption('#config-midi-input-port', 'long')
        await expect(page.locator('#midi-status')).toContainText('Connected:')
        for (const selector of ['#config', '#config-close', '#config-midi-input-port']) {
            const box = await page.locator(selector).boundingBox()
            expect(box.x).toBeGreaterThanOrEqual(0)
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
        }
        const closeBox = await page.locator('#config-close').boundingBox()
        expect(closeBox.y + closeBox.height).toBeLessThan(viewport.height)
        await expect(page.getByLabel('Note arrangement', { exact: true })).toHaveCount(1)
        await page.locator('.config-body').evaluate(element => { element.scrollTop = element.scrollHeight })
        await expect(page.locator('#config-close')).toBeInViewport()
        await page.locator('.config-body').evaluate(element => { element.scrollTop = 0 })
        await page.screenshot({ path: testInfo.outputPath('settings.png') })
    })
}

test('connection progress is visible and device selection waits for completion', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    await page.evaluate(() => window.fakeMIDI.pause('a'))
    await page.selectOption('#config-midi-input-port', 'a')
    await expect(page.locator('#midi-status')).toHaveText('Connecting…')
    await expect(page.locator('#config-midi-input-port')).toBeDisabled()
    await expect(page.locator('#midi-refresh')).toBeDisabled()
    await page.selectOption('#state-noteArrangement', 'guitar')
    await page.evaluate(() => window.fakeMIDI.resume('a'))
    await expect(page.locator('#midi-status')).toHaveText('Connected: Keyboard')
    await expect(page.locator('#config-midi-input-port')).toBeEnabled()
})

test('refresh recovers from denied permissions and explains an empty input list', async ({ page }) => {
    await setup(page, null, true)
    await page.goto('/')
    await expect(page.locator('#oops')).toBeVisible()
    await page.click('#oops-close')
    await page.evaluate(() => window.fakeMIDI.grant())
    await page.click('#midi-refresh')
    await expect(page.locator('#config-midi-input-port option')).toHaveCount(3)
    await expect(page.locator('#oops')).toBeHidden()
    await page.evaluate(() => { window.fakeMIDI.unplug('a'); window.fakeMIDI.unplug('b') })
    await expect(page.locator('#midi-status')).toContainText('No MIDI inputs found')
    await expect(page.locator('#config-midi-input-port option')).toHaveCount(1)
})


test('a denied saved connection does not automatically request permission again', async ({ page }) => {
    await setup(page, { midiInputPortName: 'a' }, true)
    await page.goto('/')
    await expect(page.locator('#oops')).toBeVisible()
    expect(await page.evaluate(() => window.fakeMIDI.requests())).toBe(1)
    await page.click('#oops-close')
    await page.evaluate(() => window.fakeMIDI.grant())
    await page.click('#midi-refresh')
    await expect(page.locator('#config-midi-input-port option')).toHaveCount(3)
    expect(await page.evaluate(() => window.fakeMIDI.requests())).toBe(2)
})
