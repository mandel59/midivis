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
                id: "state-sharp",
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
                        id: "state-colorScheme-monotone",
                        type: "radio",
                        accelerator: "Alt+1",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "monotone" })
                        }
                    },
                    {
                        label: "Chromatic",
                        id: "state-colorScheme-chromatic",
                        type: "radio",
                        accelerator: "Alt+2",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "chromatic" })
                        }
                    },
                    {
                        label: "Circle of fifth",
                        id: "state-colorScheme-fifth",
                        type: "radio",
                        accelerator: "Alt+3",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "fifth" })
                        }
                    },
                    {
                        label: "Axis system",
                        id: "state-colorScheme-axis",
                        type: "radio",
                        accelerator: "Alt+4",
                        async click(menuItem, browserWindow, event) {
                            browserWindow.webContents.send("update", { colorScheme: "axis" })
                        }
                    },
                    {
                        label: "Quintave",
                        id: "state-colorScheme-quintave",
                        type: "radio",
                        accelerator: "Alt+5",
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
ipcMain.on("state-loaded", (event, state) => {
    if (typeof state.sharp === "boolean") {
        const item = menu.getMenuItemById("state-sharp")
        if (item) item.checked = true
    }
    if (typeof state.colorScheme === "string") {
        const item = menu.getMenuItemById(`state-colorScheme-${state.colorScheme}`)
        if (item) item.checked = true
    }
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
