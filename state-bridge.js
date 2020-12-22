const { useElectron } = require("./env")
const { openInputPortByName } = require("./midi-bridge")

if (useElectron) {
    const { ipcRenderer } = require("electron")

    function subscribeMenuUpdateState(updateState) {
        ipcRenderer.on("update", (event, newState) => {
            updateState(newState)
        })
    }

    function subscribeMenuShowConfigDialog(showConfigDialog) {
        ipcRenderer.on("showConfigDialog", (event) => {
            showConfigDialog()
        })
    }

    function sendStateLoaded(state) {
        ipcRenderer.send("state-loaded", state)
        if (typeof state.midiInputPortName === "string") {
            openInputPortByName(state.midiInputPortName).then(ok => {
                if (!ok) {
                    showConfigDialog()
                }
            })
        }
    }

    module.exports = {
        subscribeMenuUpdateState,
        subscribeMenuShowConfigDialog,
        sendStateLoaded,
    }

} else {
    function subscribeMenuUpdateState(updateState) {
    }

    function subscribeMenuShowConfigDialog(showConfigDialog) {
        window.addEventListener("keydown", (ev) => {
            if (ev.ctrlKey && ev.code === "Comma") {
                showConfigDialog()
            }
        })
    }

    function sendStateLoaded(state) {
        if (typeof state.sharp === "boolean") {
            /** @type {HTMLInputElement} */
            const item = document.getElementById("state-sharp")
            if (item) item.checked = true
        }
        if (typeof state.colorScheme === "string") {
            /** @type {HTMLInputElement} */
            const item = document.getElementById(`state-colorScheme-${state.colorScheme}`)
            if (item) item.checked = true
        }
        if (typeof state.midiInputPortName === "string") {
            openInputPortByName(state.midiInputPortName).then(ok => {
                if (!ok) {
                    showConfigDialog()
                }
            })
        }
    }

    module.exports = {
        subscribeMenuUpdateState,
        subscribeMenuShowConfigDialog,
        sendStateLoaded,
    }
}
