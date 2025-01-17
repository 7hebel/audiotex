const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { importAudiobook } = require('./backend/audiobook');
const db = require('./backend/database');
const path = require('path');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0f0e11',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Ensure this path points to your preload.js
            nodeIntegration: false, // Disable nodeIntegration for security
            contextIsolation: true, // Isolate the context for security
        }
    });

    win.setMenu(null);
    win.loadFile('index.html');
    win.webContents.openDevTools();
}

ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (!result.canceled) {
        console.log("calling with ", result.filePaths[0]);
        await importAudiobook(result.filePaths[0]);
    }
});


app.whenReady().then(() => {
    createWindow();
    db.initializeDatabase();
})

app.on('window-all-closed', () => {
    db.closeDatabase();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
