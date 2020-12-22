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
