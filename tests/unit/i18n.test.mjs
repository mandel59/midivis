import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { catalogs, resolveLocale, createTranslator, translateDocument, errorMessageKey, UIError } from '../../src/i18n.js'
import { normalizeState } from '../../src/state.js'
import { noteArrangements } from '../../src/note-arrangement.js'
import { colorSchemes } from '../../src/color-scheme.js'

test('language preferences resolve regional tags and fall back to English', () => {
    assert.equal(resolveLocale('auto', ['ja-JP', 'en-US']), 'ja')
    assert.equal(resolveLocale('auto', ['fr-FR', 'ja']), 'ja')
    assert.equal(resolveLocale('auto', ['en-GB', 'ja']), 'en')
    assert.equal(resolveLocale('auto', ['de']), 'en')
    assert.equal(resolveLocale('auto', []), 'en')
    assert.equal(resolveLocale('en', ['ja']), 'en')
    assert.equal(normalizeState({ language: 'bad' }).language, 'auto')
    assert.equal(normalizeState({ language: 'ja' }).language, 'ja')
    assert.equal(normalizeState({}).language, 'auto')
})
test('catalogs have the same keys and interpolation parameters', () => {
    assert.deepEqual(Object.keys(catalogs.ja).sort(), Object.keys(catalogs.en).sort())
    for (const key of Object.keys(catalogs.en)) {
        assert.ok(catalogs.ja[key].trim())
        assert.deepEqual(catalogs.ja[key].match(/\{\w+\}/g), catalogs.en[key].match(/\{\w+\}/g))
    }
    assert.equal(createTranslator('ja')('connected', { name: '<b>Device</b>' }), '接続中：<b>Device</b>')
})
test('all static UI translation markers and layout/color options exist in the catalogs', () => {
    for (const file of ['index', 'about']) {
        const dom = new JSDOM(readFileSync(new URL(`../../src/public/${file}.html`, import.meta.url), 'utf8'))
        for (const element of dom.window.document.querySelectorAll('*')) {
            for (const attr of element.attributes) if (attr.name.startsWith('data-i18n')) assert.ok(attr.value in catalogs.en, attr.value)
        }
        dom.window.close()
    }
    for (const { id } of noteArrangements) assert.ok(`layout.${id}` in catalogs.en)
    for (const { id } of colorSchemes) assert.ok(`color.${id}` in catalogs.en)
})
test('translation changes text and accessible names without replacing inputs', () => {
    const dom = new JSDOM('<label><input value="draft"><span data-i18n="language">Language</span></label><button data-i18n-aria-label="closeSettings"></button>')
    const document = dom.window.document
    const input = document.querySelector('input')
    translateDocument(document, 'ja')
    assert.equal(document.documentElement.lang, 'ja')
    assert.equal(document.querySelector('button').getAttribute('aria-label'), '設定を閉じる')
    assert.equal(document.querySelector('input'), input)
    assert.equal(input.value, 'draft')
    assert.equal(document.querySelector('label').textContent, '言語 / Language')
    dom.window.close()
})
test('error codes map to translatable messages with original causes retained', () => {
    assert.equal(errorMessageKey(new DOMException('denied', 'NotAllowedError')), 'errorPermission')
    const cause = new Error('driver-specific details')
    const error = new UIError('errorDevice', cause)
    assert.equal(errorMessageKey(error), 'errorDevice')
    assert.equal(error.cause, cause)
    assert.equal(errorMessageKey(cause), 'errorUnknown')
})
