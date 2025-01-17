const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openDirectory: () => ipcRenderer.invoke('open-directory-dialog')
});