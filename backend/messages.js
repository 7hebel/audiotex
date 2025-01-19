let mainWindow = null;

function setupWindow(win) { mainWindow = win; }

function displayInfo(message) {
    if (mainWindow) mainWindow.webContents.send('msg-info', message);
}

function displayError(message) {
    if (mainWindow) mainWindow.webContents.send('msg-error', message)
}

module.exports = {
    setupWindow,
    displayInfo,
    displayError
}
