let mainWindow: any = null;

export function setupWindow(win: any) { mainWindow = win; }

export function displayInfo(message: string): void {
    if (mainWindow) mainWindow.webContents.send('MSG:info', message);
}

export function displayError(message: string): void {
    if (mainWindow) mainWindow.webContents.send('MSG:error', message)
}
