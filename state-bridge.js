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
    }

    module.exports = {
        subscribeMenuUpdateState,
        subscribeMenuShowConfigDialog,
        sendStateLoaded,
    }
}
