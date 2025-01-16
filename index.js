const { app, BrowserWindow } = require('electron');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#2e2c29',
    });

    win.setMenu(null);
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow()
})
