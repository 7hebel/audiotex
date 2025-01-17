const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    importNewAudiobook: () => ipcRenderer.invoke("import-new-ab"),
    getAllAudiobooks: () => ipcRenderer.invoke("get-all-audiobooks"),
    getAudiobookData: (ab_id) => ipcRenderer.invoke("get-audiobook-data", ab_id),
    getTracks: (ab_id) => ipcRenderer.invoke("get-tracks", ab_id),
    deleteAudiobook: (ab_id) => ipcRenderer.invoke("delete-audiobook", ab_id)
});
