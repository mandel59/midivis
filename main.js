const { app, BrowserWindow, ipcMain, Menu } = require("electron")
const { MidiInputPortSelector } = require("./midi-port-selector")

const isMac = process.platform === "darwin"
const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
        label: "File",
        submenu: [
            {
                label: "Settings",
                accelerator: isMac ? "Cmd+," : "Ctrl+,",
                async click(menuItem, browserWindow, event) {
                    browserWindow.webContents.send("showConfigDialog")
                }
            },
            isMac ? { role: "close" } : { role: "quit" }
        ]
    },
    {
        label: "View",
        submenu: [
            {
                label: "Use sharp notes",
                type: "checkbox",
                accelerator: "Alt+S",
                async click(menuItem, browserWindow, event) {
                    browserWindow.webContents.send("update", { sharp: menuItem.checked })
                }
            },
            {
                label: "Color scheme",
                submenu: [
                    {
                        label: "Monotone",
                        type: "radio",
                        accelerator: "Alt+1",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "monotone" })
                        }
                    },
                    {
                        label: "Chromatic",
                        type: "radio",
                        accelerator: "Alt+2",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "chromatic" })
                        }
                    },
                    {
                        label: "Axis system",
                        type: "radio",
                        accelerator: "Alt+3",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "axis" })
                        }
                    },
                    {
                        label: "Quintave",
                        type: "radio",
                        accelerator: "Alt+4",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "quintave" })
                        }
                    },
                ]
            },
            { type: "separator" },
            { role: "reload" },
            { role: "forceReload" },
            { role: "toggleDevTools" },
            { type: "separator" },
            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
            { type: "separator" },
            { role: "togglefullscreen" }
        ]
    },
    { role: "windowMenu" },
]
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

const input = new MidiInputPortSelector()

ipcMain.handle("getInputPortOptions", (event) => {
    return input.portOptions()
})
ipcMain.handle("useInputPortByName", (event, name) => {
    return input.openPortByName(name)
})

function createWindow() {
    const win = new BrowserWindow({
        width: 480,
        height: 768,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })
    win.loadFile("index.html")
    win.webContents.on("did-finish-load", () => {
        const onMessage = (deltaTime, message) => {
            win.webContents.send("midiMessage", deltaTime, message)
        }
        input.on("message", onMessage)
        const off = () => {
            input.off("message", onMessage)
        }
        win.webContents.once("did-navigate", off)
        win.webContents.once("destroyed", off)
    })
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
