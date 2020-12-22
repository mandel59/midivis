const { app, BrowserWindow, ipcMain, Menu } = require("electron")
const { colorSchemes } = require("./color-scheme")

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
                submenu: colorSchemes.map(({ id, label, key }) => ({
                    label,
                    id: `state-colorScheme-${id}`,
                    type: "radio",
                    accelerator: `Alt+${key}`,
                    async click(menuItem, browserWindow, event) {
                        browserWindow.webContents.send("update", { colorScheme: id })
                    }
                }))
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

ipcMain.on("state-loaded", (event, state) => {
    if (typeof state.sharp === "boolean") {
        const item = menu.getMenuItemById("state-sharp")
        if (item) item.checked = state.sharp
    }
    if (typeof state.colorScheme === "string") {
        const item = menu.getMenuItemById(`state-colorScheme-${state.colorScheme}`)
        if (item) item.checked = true
    }
})

function createWindow() {
    const win = new BrowserWindow({
        width: 500,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })
    win.loadFile("index.html")
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
