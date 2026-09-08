import './assets.js'
import './register-service-worker.js'
import { startApplication } from './app.js'
import { createStateStore } from './state.js'
import { MidiInputPortSelector } from './midi-port-selector-webmidi.js'

startApplication({ document, store: createStateStore(), midi: new MidiInputPortSelector() })
    .catch(error => console.error(error))
